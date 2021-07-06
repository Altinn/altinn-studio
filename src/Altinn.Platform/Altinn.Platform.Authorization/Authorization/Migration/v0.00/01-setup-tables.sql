-- Table: delegation.delegatedPolicy
CREATE TABLE IF NOT EXISTS delegation.delegatedPolicy
(
  policyChangeId bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  policyId bigint NOT NULL,
  altinnAppId character varying COLLATE pg_catalog."default" NOT NULL,
  offeredByPartyId integer NOT NULL,
  coveredByPartyId integer,
  coveredByUserId integer,
  performingUserId integer NOT NULL,
  blobStoragePolicyPath character varying COLLATE pg_catalog."default" NOT NULL,
  blobStorageVersionId character varying COLLATE pg_catalog."default",
  created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
)
TABLESPACE pg_default;

-- Index: AltinnAppID_OfferedByPartyId_CoveredByUserId_CoveredByPartyId
CREATE INDEX IF NOT EXISTS idx_altinnAppID_offeredByPartyId_coveredByUserId_coveredByPartyId
  ON delegation.delegatedPolicy USING btree
  (altinnAppId COLLATE pg_catalog."default" ASC NULLS LAST, offeredByPartyId ASC NULLS LAST, coveredByPartyId ASC NULLS LAST, coveredByUserId ASC NULLS LAST)
  TABLESPACE pg_default;

-- Index: PolicyId
CREATE INDEX IF NOT EXISTS idx_policyId
  ON delegation.delegatedPolicy USING btree
  (policyId ASC NULLS LAST)
  TABLESPACE pg_default;

-- Index: Created
CREATE INDEX IF NOT EXISTS idx_created
  ON delegation.delegatedPolicy USING btree
  (created ASC NULLS LAST)
  TABLESPACE pg_default;
