GRANT USAGE ON SCHEMA delegatedPolicy TO platform_authorization;
GRANT SELECT,INSERT,UPDATE,REFERENCES,DELETE,TRUNCATE,REFERENCES,TRIGGER ON ALL TABLES IN SCHEMA events TO platform_authorization;
GRANT ALL ON ALL SEQUENCES IN SCHEMA delegatedPolicy TO platform_authorization;


