# base image
FROM gitea/gitea:1.14.4

# copy configuration file
# Has to be copied to the templates-folder so parsing of environment variables is correct
COPY gitea-config/app.ini etc/templates/app.ini

# Copy rest of configuration
COPY gitea-data/gitea/options data/gitea/options/
COPY gitea-data/gitea/public/img data/gitea/public/img
COPY gitea-data/gitea/templates data/gitea/templates
