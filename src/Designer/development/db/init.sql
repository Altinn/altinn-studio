-- designerdb is created by the postgres entrypoint itself (POSTGRES_DB in compose.yaml), so it
-- must not be created here: this script runs with ON_ERROR_STOP, and a duplicate CREATE DATABASE
-- aborts the first container start.
CREATE ROLE gitea WITH LOGIN PASSWORD 'gitea';
CREATE ROLE designer WITH LOGIN PASSWORD 'designer';
CREATE DATABASE giteadb WITH OWNER gitea TEMPLATE template0 ENCODING UTF8 LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8';
