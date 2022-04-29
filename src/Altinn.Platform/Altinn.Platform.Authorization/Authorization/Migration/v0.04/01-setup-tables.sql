-- Enum: delegation.delegationChangeType
DO $$ BEGIN
    CREATE TYPE delegation.delegationChangeType AS ENUM ('grant', 'revoke', 'revokelast');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table: drop/create delegation.delegationChanges table both to drop old content and change from isDeleted to delegationChangeType
DROP TABLE IF EXISTS delegation.delegationChanges CASCADE;
CREATE TABLE IF NOT EXISTS delegation.delegationChanges
(
  delegationChangeId bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  delegationChangeType delegation.delegationChangeType NOT NULL,
  altinnAppId character varying COLLATE pg_catalog."default" NOT NULL,
  offeredByPartyId integer NOT NULL,
  coveredByPartyId integer,
  coveredByUserId integer,
  performedByUserId integer NOT NULL,
  blobStoragePolicyPath character varying COLLATE pg_catalog."default" NOT NULL,
  blobStorageVersionId character varying COLLATE pg_catalog."default",
  created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
)
TABLESPACE pg_default;

-- Set start value of delegationChangeId to 100K to allow some room for manual debugging without collision
ALTER SEQUENCE delegation.delegationchanges_delegationchangeid_seq RESTART WITH 100000 INCREMENT BY 1;

-- Index: idx_altinnappid
CREATE INDEX IF NOT EXISTS idx_altinnappid
  ON delegation.delegationChanges USING btree
  (altinnappid COLLATE pg_catalog."default" ASC NULLS LAST)
  TABLESPACE pg_default;

-- Index: idx_offeredby
CREATE INDEX IF NOT EXISTS idx_offeredby
    ON delegation.delegationChanges USING btree
    (offeredbypartyid ASC NULLS LAST)
    TABLESPACE pg_default;

-- Index: idx_coveredbyuser
CREATE INDEX IF NOT EXISTS idx_coveredbyuser
    ON delegation.delegationChanges USING btree
    (coveredbyuserid ASC NULLS LAST)
    TABLESPACE pg_default;

-- Index: idx_coveredbyparty
CREATE INDEX IF NOT EXISTS idx_coveredbyparty
    ON delegation.delegationChanges USING btree
    (coveredbypartyid ASC NULLS LAST)
    TABLESPACE pg_default;
