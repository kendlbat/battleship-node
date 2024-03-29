FROM node:lts-alpine
ENV NODE_ENV=production
# Get port from argument
ARG PORT=8080
ENV PORT=$PORT
ARG ADDRESS="0.0.0.0"
ENV ADDRESS=$ADDRESS
WORKDIR /usr/src/app
COPY . .
RUN chown -R node /usr/src/app
USER node
EXPOSE $PORT
CMD ["npm", "start"]
