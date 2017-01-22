FROM ubuntu:latest
MAINTAINER Samuel Brezani "samuel.brezani@gmail.com"

RUN apt-get update && apt-get install -y \
        curl
        
RUN curl -sL https://deb.nodesource.com/setup_7.x | bash -

RUN apt-get install -y \
    nodejs \
    openalpr \
    openalpr-daemon \
    openalpr-utils \
    libopenalpr-dev
    
RUN apt-get remove -y curl

RUN rm -rf /var/lib/apt/lists/*

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json index.js /usr/src/app/

RUN npm install

EXPOSE 8080
CMD [ "npm", "start" ]