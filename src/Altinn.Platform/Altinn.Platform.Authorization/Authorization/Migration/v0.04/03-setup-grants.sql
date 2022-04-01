-- Grants for platform_authorization must be executed again for new sequence (Enum) and since delegationChanges table has been drop/created
GRANT SELECT,INSERT,UPDATE,REFERENCES,DELETE,TRUNCATE,TRIGGER ON ALL TABLES IN SCHEMA delegation TO platform_authorization;
GRANT ALL ON ALL SEQUENCES IN SCHEMA delegation TO platform_authorization;
