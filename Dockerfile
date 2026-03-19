FROM node:20-alpine

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

EXPOSE 5000
ENV NODE_ENV=production
CMD ["npm", "start"]
