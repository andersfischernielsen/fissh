FROM node:22-alpine

WORKDIR /fissh
COPY package.json /fissh
RUN npm install

COPY main.ts fish.ts ssh.ts host_key /fissh/

EXPOSE 22
ENTRYPOINT [ "npx", "tsx", "main.ts" ]
