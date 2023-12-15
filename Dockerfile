FROM eclipse-temurin:11-jdk-alpine
RUN apk -U upgrade \
  && apk add --repository https://dl-cdn.alpinelinux.org/alpine/v3.14/main/ --no-cache \
    "nodejs<16" \
    npm \
    yarn \
    curl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD node app.js
EXPOSE 7000