FROM alpine

LABEL "com.icfj.licenses"="ICFJ" \
      maintainer="Rodrigo Brabo <brabo.rodrigo@gmail.com>" \
      version="1.0"

WORKDIR /srv/licenses

COPY package* ./
COPY . .

ENV LANG=en_US.UTF-8 \
LANGUAGE=en_US.UTF-8

RUN apk update
RUN apk upgrade
RUN apk add ca-certificates && update-ca-certificates
RUN apk add --update --no-cache tzdata

RUN apk add --update npm
RUN cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime && echo America/Sao_Paulo > /etc/timezone
RUN npm cache clean -f
RUN npm install npm@latest -g
RUN npm install -g n 10
RUN rm -rf /var/cache/apk/*

RUN ["npm", "install"]


CMD ["npm", "run", "production"]