import {
  Server,
  type ClientInfo,
  type Connection,
  type ServerConnectionListener,
} from "ssh2";
import { stream } from "./fish";

const privateKey = await Bun.file("host_key").text();

const connection: ServerConnectionListener = (
  connection: Connection,
  _: ClientInfo,
) => {
  let columns: number = NaN;
  let rows: number = NaN;

  connection.on("authentication", (c) => c.accept());
  connection.on("session", (accept) => {
    const session = accept();

    session.on("pty", (accept, _, info) => {
      columns = Math.floor(info.cols / 2);
      rows = info.rows;
      accept();
    });

    session.on("window-change", (accept, _, info) => {
      rows = info.rows;
      columns = Math.floor(info.cols / 2);
      accept();
    });

    session.on("shell", (accept) => {
      const channel = accept();
      const interval = stream(channel, rows, columns, () => [rows, columns]);

      channel.on("data", (data: Buffer) => {
        if (data[0] === 0x03 || data[0] === 0x04) {
          clearInterval(interval);
          channel.end();
        }
      });

      channel.on("close", () => clearInterval(interval));
    });
  });

  return;
};

export const start = () => {
  new Server({ hostKeys: [privateKey] }, connection).listen(2222);
};
