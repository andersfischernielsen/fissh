import {
  Server,
  type ClientInfo,
  type Connection,
  type ServerConnectionListener,
} from "ssh2";
import { stream } from "./fish";

const privateKey = await Bun.file("host_key").text();

const maxConnections = 2000;
let activeConnections = 0;

const connection: ServerConnectionListener = (
  connection: Connection,
  info: ClientInfo,
) => {
  const { ip } = info;
  console.log(`Connected: ${ip} (${activeConnections + 1} active)`);

  const isAtCapacity = activeConnections >= maxConnections;
  if (!isAtCapacity) {
    activeConnections++;
    connection.on("close", () => {
      activeConnections--;
      console.log(`Closed: ${ip} (${activeConnections} active)`);
    });
  } else {
    connection.on("close", () => {
      console.log(`Closed: ${ip} (rejected, at capacity)`);
    });
  }

  let columns: number = NaN;
  let rows: number = NaN;

  connection.on("authentication", (c) => c.accept());
  connection.on("error", () => {});
  connection.on("session", (accept) => {
    const session = accept();

    session.on("pty", (accept, _, info) => {
      columns = Math.floor(info.cols / 2);
      rows = info.rows;
      accept();
    });

    session.on("window-change", (_, __, info) => {
      rows = info.rows;
      columns = Math.floor(info.cols / 2);
    });

    session.on("shell", (accept) => {
      const channel = accept();

      if (isAtCapacity) {
        channel.write(
          "\r\n🐟 Too many concurrent connections! Try again later.\r\n\r\n",
        );
        channel.end();
        return;
      }

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
  new Server({ hostKeys: [privateKey] }, connection).listen(22);
};
