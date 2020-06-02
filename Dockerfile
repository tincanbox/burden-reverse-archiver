
# Running manually...
# docker build --build-arg SERIAL=YOURSERIALVAL -t burden/reverse-archiver .  
# docker run --rm --name burden-reverse-archiver -p 9000:9000 -it burden/reverse-archiver

FROM node:12
RUN apt-get update -y

WORKDIR /opt/app

# node packages
RUN npm install -g nodemon
COPY package*.json ./
RUN npm install

#----------------------------------------
# Your app dependencies.
#----------------------------------------
RUN apt-get install -y p7zip-full

#----------------------------------------
# Bootstraps
#----------------------------------------
ARG SERIAL=unknown

COPY ./burden ./burden

EXPOSE 9000
CMD [ "npx", "colloquist", "server" ]
