-- Table: delegation.delegatedPolicy
CREATE TABLE IF NOT EXISTS delegation.delegatedPolicy
(
  policyChangeId bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  altinnAppId character varying COLLATE pg_catalog."default" NOT NULL,
  offeredByPartyId integer NOT NULL,
  coveredByPartyId integer,
  coveredByUserId integer,
  performingUserId integer NOT NULL,
  blobStoragePolicyPath character varying COLLATE pg_catalog."default" NOT NULL,
  blobStorageVersionId character varying COLLATE pg_catalog."default",
  isDeleted bool default false,
  created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
)
TABLESPACE pg_default;

-- Index: idx_altinnappid
CREATE INDEX IF NOT EXISTS idx_altinnappid
  ON delegation.delegatedpolicy USING btree
  (altinnappid COLLATE pg_catalog."default" ASC NULLS LAST)
  TABLESPACE pg_default;

-- Index: idx_offeredby
CREATE INDEX IF NOT EXISTS idx_offeredby
    ON delegation.delegatedpolicy USING btree
    (offeredbypartyid ASC NULLS LAST)
    TABLESPACE pg_default;

-- Index: idx_coveredbyuser
CREATE INDEX IF NOT EXISTS idx_coveredbyuser
    ON delegation.delegatedpolicy USING btree
    (coveredbyuserid ASC NULLS LAST)
    TABLESPACE pg_default;

-- Index: idx_coveredbyparty
CREATE INDEX IF NOT EXISTS idx_coveredbyparty
    ON delegation.delegatedpolicy USING btree
    (coveredbypartyid ASC NULLS LAST)
    TABLESPACE pg_default;
