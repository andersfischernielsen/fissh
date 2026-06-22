import { readFileSync } from "node:fs";
import ssh2, { type ClientInfo, type Connection, type ServerConnectionListener } from "ssh2";
const { Server } = ssh2;

import { render } from "./fish.ts";

const privateKey = readFileSync("host_key");

const maxConnections = 1000;
let activeConnections = 0;

const minRows = 2;
const maxRows = 100;
const minColumns = 1;
const maxColumns = 200;

const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.floor(n) || min));

const connection: ServerConnectionListener = (connection: Connection, info: ClientInfo) => {
  const { ip } = info;
  let columns = 40;
  let rows = 24;
  let counted = false;

  console.log(`Connected: ${ip}`);

  connection.on("authentication", (c) => c.accept());
  connection.on("error", (err) => {
    console.error(`Connection error from ${ip}: ${err.message}`);
  });
  connection.on("close", () => {
    if (counted) {
      activeConnections--;
      console.log(`Closed: ${ip} (${activeConnections} active)`);
    } else {
      console.log(`Closed: ${ip} (pre-auth)`);
    }
  });
  connection.on("session", (accept) => {
    const session = accept();

    session.on("pty", (accept, _, info) => {
      columns = clamp(info.cols / 2, minColumns, maxColumns);
      rows = clamp(info.rows, minRows, maxRows);
      accept();
    });

    session.on("window-change", (_, __, info) => {
      columns = clamp(info.cols / 2, minColumns, maxColumns);
      rows = clamp(info.rows, minRows, maxRows);
    });

    session.on("shell", (accept) => {
      const channel = accept();

      if (activeConnections >= maxConnections) {
        channel.write("\r\n🐟 Too many concurrent connections! Try again later.\r\n\r\n");
        channel.end();
        return;
      }

      activeConnections++;
      counted = true;
      console.log(`Shell opened: ${ip} (${activeConnections} active)`);

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
