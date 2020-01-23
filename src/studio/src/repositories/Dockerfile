# base image
FROM gitea/gitea:1.10.3

# copy configuration file
COPY ./src/repositories/gitea-data/gitea/conf/app.ini data/gitea/conf/app.ini
COPY ./src/repositories/gitea-data/gitea/options data/gitea/options/
COPY ./src/repositories/gitea-data/gitea/public/img data/gitea/public/img
COPY ./src/repositories/gitea-data/gitea/templates data/gitea/templates
