FROM node:26-alpine

WORKDIR /fissh
COPY package.json /fissh
RUN npm install

COPY main.ts fish.ts ssh.ts host_key /fissh/

EXPOSE 22
ENTRYPOINT [ "node", "main.ts" ]
