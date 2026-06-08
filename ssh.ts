import { readFileSync } from "node:fs";
import ssh2, { type ClientInfo, type Connection, type ServerConnectionListener } from "ssh2";
const { Server } = ssh2;

import { render } from "./fish.ts";

const privateKey = readFileSync("host_key");

const maxConnections = 1000;
let activeConnections = 0;

const trackActiveConnections = (
  isAtCapacity: boolean,
  activeConnections: number,
  connection: Connection,
  info: ClientInfo,
) => {
  const { ip } = info;
  console.log(`Connected: ${ip} (${activeConnections + 1} active)`);

  if (isAtCapacity) {
    connection.on("close", () => {
      console.log(`Closed: ${ip} (rejected, at capacity)`);
    });

    return activeConnections;
  }

  connection.on("close", () => {
    activeConnections--;
    console.log(`Closed: ${ip} (${activeConnections} active)`);
  });

  return activeConnections + 1;
};

const connection: ServerConnectionListener = (connection: Connection, info: ClientInfo) => {
  let columns: number = NaN;
  let rows: number = NaN;

  const isAtCapacity = activeConnections >= maxConnections;
  activeConnections = trackActiveConnections(isAtCapacity, activeConnections, connection, info);

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
      columns = Math.floor(info.cols / 2);
      rows = info.rows;
    });

    session.on("shell", (accept) => {
      const channel = accept();

      if (isAtCapacity) {
        channel.write("\r\n🐟 Too many concurrent connections! Try again later.\r\n\r\n");
        channel.end();
        return;
      }

      const { interval, close } = render(channel, rows, columns, () => [rows, columns]);

      const maxConnectionDuration = setTimeout(
        () => {
          close(channel);
          clearInterval(interval);
          channel.end();
        },
        2 * 60 * 1000,
      );

      channel.on("data", (data: Buffer) => {
        if (data[0] === 0x03 || data[0] === 0x04) {
          clearTimeout(maxConnectionDuration);
          close(channel);
          clearInterval(interval);
          channel.end();
        }
      });

      channel.on("close", () => {
        clearTimeout(maxConnectionDuration);
        clearInterval(interval);
      });
    });
  });

  return;
};

export const start = () => {
  new Server({ hostKeys: [privateKey] }, connection).listen(22);
};
