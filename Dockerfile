FROM node:26-alpine

WORKDIR /fissh
COPY package.json package-lock.json /fissh/
RUN npm ci --omit=dev --ignore-scripts

COPY main.ts fish.ts ssh.ts host_key /fissh/
RUN chown -R node:node /fissh

USER node
EXPOSE 22
ENTRYPOINT [ "node", "main.ts" ]
