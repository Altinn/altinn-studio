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
  isDeleted bool default true,
  created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
)
TABLESPACE pg_default;

-- Index: idx_app_offeredby_coveredby
CREATE INDEX IF NOT EXISTS idx_app_offeredby_coveredby
  ON delegation.delegatedPolicy USING btree
  (altinnAppId COLLATE pg_catalog."default" ASC NULLS LAST, offeredByPartyId ASC NULLS LAST, coveredByPartyId ASC NULLS LAST, coveredByUserId ASC NULLS LAST)
  TABLESPACE pg_default;

