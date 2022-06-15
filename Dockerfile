FROM oraclelinux:7-slim

RUN  yum -y install oracle-release-el7 oracle-nodejs-release-el7 && \
     yum-config-manager --disable ol7_developer_EPEL && \
     yum -y install oracle-instantclient19.3-basiclite nodejs && \
     yum -y install iputils && \
     yum -y install telnet && \
     rm -rf /var/cache/yum

WORKDIR /myapp
ADD package.json /myapp/
ADD package-lock.json /myapp/
ADD public /myapp/
ADD routes /myapp/
ADD views /myapp/
ADD app.js /myapp/
RUN npm install

COPY . .

EXPOSE 3000
EXPOSE 1521
CMD ["node", "app.js"]