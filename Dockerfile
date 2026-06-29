FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci && npx prisma generate

COPY src ./src
COPY scripts ./scripts

ENV NODE_ENV=production

USER node

EXPOSE 8000

CMD ["npm", "start"]
