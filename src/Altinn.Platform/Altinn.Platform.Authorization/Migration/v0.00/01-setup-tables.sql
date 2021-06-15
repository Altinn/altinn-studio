-- Table: delegatedPolicy.delegatedPolicy
CREATE TABLE IF NOT EXISTS delegatedPolicy.delegatedPolicy
(
    policyId bigint id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    altinnAppId character varying COLLATE pg_catalog."default" NOT NULL,
    offeredByPartyId integer NOT NULL,
    coveredByPartyId integer,
    coveredByUserId integer,
    performingUserId integer NOT NULL,
    blobStoragePolicyPath character varying COLLATE pg_catalog."default" NOT NULL,
    blobStorageVersionId character varying COLLATE pg_catalog."default",
    created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
)
TABLESPACE pg_default;

-- Index: AltinnAppID_OfferedByPartyId_CoveredByUserId_CoveredByPartyId
CREATE INDEX IF NOT EXISTS idx_altinnAppID_offeredByPartyId_coveredByUserId_coveredByPartyId
    ON delegatedPolicy.delegatedPolicy USING btree
    (altinnAppId COLLATE pg_catalog."default" ASC NULLS LAST, offeredByPartyId ASC NULLS LAST, coveredByPartyId ASC NULLS LAST, coveredByUserId ASC NULLS LAST)
    TABLESPACE pg_default;

-- Index: Created
CREATE INDEX IF NOT EXISTS idx_created
    ON delegatedPolicy.delegatedPolicy USING btree
    (created ASC NULLS LAST)
    TABLESPACE pg_default;
