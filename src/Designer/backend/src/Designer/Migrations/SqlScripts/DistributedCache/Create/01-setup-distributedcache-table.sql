CREATE TABLE IF NOT EXISTS designer.distributedcache
(
    "Id" text COLLATE pg_catalog."default" NOT NULL,
    "Value" bytea,
    "ExpiresAtTime" timestamp with time zone,
    "SlidingExpirationInSeconds" double precision,
    "AbsoluteExpiration" timestamp with time zone,
    CONSTRAINT "DistCache_pkey" PRIMARY KEY ("Id")
)

TABLESPACE pg_default;
