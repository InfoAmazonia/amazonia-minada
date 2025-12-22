FROM node:24-alpine

LABEL "com.icfj.licenses"="ICFJ" \
      maintainer="Rodrigo Brabo <brabo.rodrigo@gmail.com>" \
      version="1.0"

WORKDIR /srv/licenses

COPY . .

ENV LANG=en_US.UTF-8 \
LANGUAGE=en_US.UTF-8

RUN apk update
RUN apk upgrade
RUN apk add ca-certificates && update-ca-certificates
RUN apk add --update --no-cache tzdata

ENV TZ=America/Sao_Paulo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apk add --update npm
RUN npm install


CMD ["npm", "run", "production"]