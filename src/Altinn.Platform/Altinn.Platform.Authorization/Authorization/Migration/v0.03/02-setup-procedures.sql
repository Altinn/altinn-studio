-- Function: delegation.get_all_current_changes

CREATE OR REPLACE FUNCTION delegation.get_all_current_changes(
	_altinnappids character varying[],
	_offeredbypartyids integer[])
    RETURNS SETOF delegation.delegationchanges 
    LANGUAGE 'sql'
    COST 100
    STABLE PARALLEL SAFE 
    ROWS 1000

AS $BODY$
SELECT
delegationchangeid,
altinnappid,
offeredbypartyid,
coveredbypartyid,
coveredbyuserid,
performedbyuserid,
blobstoragepolicypath,
blobstorageversionid,
isdeleted,
created
FROM delegation.delegationchanges
	INNER JOIN
	(
		SELECT MAX(delegationChangeId) AS maxChange
	 	FROM delegation.delegationchanges
		WHERE
		  (_altinnappids IS NULL OR altinnAppId = ANY (_altinnAppIds))
		  AND (_offeredbypartyids IS NULL OR offeredByPartyId = ANY (_offeredByPartyIds))
		GROUP BY altinnAppId, offeredByPartyId, coveredByPartyId, coveredByUserId
	) AS selectMaxChange
	ON delegationChangeId = selectMaxChange.maxChange
$BODY$;

ALTER FUNCTION delegation.get_all_current_changes(character varying[], integer[])
    OWNER TO platform_authorization;


-- Function: delegation.get_all_current_changes_partyids
CREATE OR REPLACE FUNCTION delegation.get_all_current_changes_partyids(
	_altinnappids character varying[],
	_offeredbypartyids integer[],
	_coveredbypartyids integer[])
    RETURNS SETOF delegation.delegationchanges 
    LANGUAGE 'sql'
    COST 100
    STABLE PARALLEL SAFE 
    ROWS 1000

AS $BODY$
SELECT
delegationchangeid,
altinnappid,
offeredbypartyid,
coveredbypartyid,
coveredbyuserid,
performedbyuserid,
blobstoragepolicypath,
blobstorageversionid,
isdeleted,
created
FROM delegation.delegationchanges
	INNER JOIN
	(
		SELECT MAX(delegationChangeId) AS maxChange
	 	FROM delegation.delegationchanges
		WHERE
		  (_altinnappids IS NULL OR altinnAppId = ANY (_altinnAppIds))
		  AND (_offeredbypartyids IS NULL OR offeredByPartyId = ANY (_offeredByPartyIds))
		  AND coveredByPartyId = ANY (_coveredByPartyIds)
		GROUP BY altinnAppId, offeredByPartyId, coveredByPartyId, coveredByUserId
	) AS selectMaxChange
	ON delegationChangeId = selectMaxChange.maxChange
$BODY$;

-- Function: delegation.get_all_current_changes_userids

CREATE OR REPLACE FUNCTION delegation.get_all_current_changes_userids(
	_altinnappids character varying[],
	_offeredbypartyids integer[],
	_coveredbyuserids integer[])
    RETURNS SETOF delegation.delegationchanges 
    LANGUAGE 'sql'
    COST 100
    STABLE PARALLEL SAFE 
    ROWS 1000

AS $BODY$
SELECT
delegationchangeid,
altinnappid,
offeredbypartyid,
coveredbypartyid,
coveredbyuserid,
performedbyuserid,
blobstoragepolicypath,
blobstorageversionid,
isdeleted,
created
FROM delegation.delegationchanges
	INNER JOIN
	(
		SELECT MAX(delegationChangeId) AS maxChange
	 	FROM delegation.delegationchanges
		WHERE
		  (_altinnappids IS NULL OR altinnAppId = ANY (_altinnAppIds))
		  AND (_offeredbypartyids IS NULL OR offeredByPartyId = ANY (_offeredByPartyIds))
		  AND coveredByUserId = ANY (_coveredByUserIds)
		GROUP BY altinnAppId, offeredByPartyId, coveredByPartyId, coveredByUserId
	) AS selectMaxChange
	ON delegationChangeId = selectMaxChange.maxChange
$BODY$;
