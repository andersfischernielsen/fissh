FROM oven/bun

USER bun
WORKDIR /fissh
COPY --chown=bun:bun package.json /fissh
RUN bun install

COPY --chown=bun:bun main.ts fish.ts ssh.ts host_key /fissh

EXPOSE 2222
ENTRYPOINT [ "bun", "run", "start" ]
