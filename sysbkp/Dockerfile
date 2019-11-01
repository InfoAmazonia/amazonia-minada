# Copy and run NPM Install
FROM node:latest as base
LABEL "com.icfj"="ICFJ" \
      maintainer="Rodrigo Brabo <brabo.rodrigo@gmail.com>" \
      version="1.0"
WORKDIR /srv/app
COPY package* ./
COPY . .
RUN ["npm", "install"]

# RUN DEVELOPMENT
FROM node:latest as development
WORKDIR /srv/app
COPY --from=base /srv/app ./
CMD ["npm", "run", "development"]

# Build ES6
FROM node:latest as build
WORKDIR /srv/app
COPY --from=base /srv/app/ ./
RUN ["npm", "run", "build"]

# RUN PRODUCTION
FROM node:latest as production
WORKDIR /srv/app
COPY --from=build /srv/app/package* ./
COPY --from=build /srv/app/dist/src ./src/
ARG NODE_ENV=production
RUN ["npm", "install"]
EXPOSE 3000
CMD ["npm", "run", "production"]