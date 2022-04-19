using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Extensions;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Repositories.Interface;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Altinn.Platform.Authorization.Repositories
{
    /// <summary>
    /// Repository implementation for PostgreSQL operations on delegations.
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class DelegationMetadataRepository : IDelegationMetadataRepository
    {
        private readonly string _connectionString;
        private readonly ILogger _logger;
        private readonly string insertDelegationChangeFunc = "select * from delegation.insert_delegationchange(@_delegationChangeType, @_altinnAppId, @_offeredByPartyId, @_coveredByUserId, @_coveredByPartyId, @_performedByUserId, @_blobStoragePolicyPath, @_blobStorageVersionId)";
        private readonly string getCurrentDelegationChangeSql = "select * from delegation.get_current_change(@_altinnAppId, @_offeredByPartyId, @_coveredByUserId, @_coveredByPartyId)";
        private readonly string getAllDelegationChangesSql = "select * from delegation.get_all_changes(@_altinnAppId, @_offeredByPartyId, @_coveredByUserId, @_coveredByPartyId)";
        private readonly string getAllCurrentDelegationChangesPartyIdsSql = "select * from delegation.get_all_current_changes_coveredbypartyids(@_altinnAppIds, @_offeredByPartyIds, @_coveredByPartyIds)";
        private readonly string getAllCurrentDelegationChangesUserIdsSql = "select * from delegation.get_all_current_changes_coveredbyuserids(@_altinnAppIds, @_offeredByPartyIds, @_coveredByUserIds)";
        private readonly string getAllCurrentDelegationChangesOfferedByPartyIdOnlysSql = "select * from delegation.get_all_current_changes_offeredbypartyid_only(@_altinnAppIds, @_offeredByPartyIds)";

        /// <summary>
        /// Initializes a new instance of the <see cref="DelegationMetadataRepository"/> class
        /// </summary>
        /// <param name="postgresSettings">The postgreSQL configurations for AuthorizationDB</param>
        /// <param name="logger">logger</param>
        public DelegationMetadataRepository(
            IOptions<PostgreSQLSettings> postgresSettings,
            ILogger<DelegationMetadataRepository> logger)
        {
            _logger = logger;
            _connectionString = string.Format(
                postgresSettings.Value.ConnectionString,
                postgresSettings.Value.AuthorizationDbPwd);
            NpgsqlConnection.GlobalTypeMapper.MapEnum<DelegationChangeType>("delegation.delegationchangetype");
        }

        /// <inheritdoc/>
        public async Task<DelegationChange> InsertDelegation(DelegationChange delegationChange)
        {
            try
            {
                await using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(insertDelegationChangeFunc, conn);
                pgcom.Parameters.AddWithValue("_delegationChangeType", delegationChange.DelegationChangeType);
                pgcom.Parameters.AddWithValue("_altinnAppId", delegationChange.AltinnAppId);
                pgcom.Parameters.AddWithValue("_offeredByPartyId", delegationChange.OfferedByPartyId);
                pgcom.Parameters.AddWithValue("_coveredByUserId", delegationChange.CoveredByUserId.HasValue ? delegationChange.CoveredByUserId.Value : DBNull.Value);
                pgcom.Parameters.AddWithValue("_coveredByPartyId", delegationChange.CoveredByPartyId.HasValue ? delegationChange.CoveredByPartyId.Value : DBNull.Value);
                pgcom.Parameters.AddWithValue("_performedByUserId", delegationChange.PerformedByUserId);
                pgcom.Parameters.AddWithValue("_blobStoragePolicyPath", delegationChange.BlobStoragePolicyPath);
                pgcom.Parameters.AddWithValue("_blobStorageVersionId", delegationChange.BlobStorageVersionId);

                using NpgsqlDataReader reader = await pgcom.ExecuteReaderAsync();
                if (reader.Read())
                {
                    return GetDelegationChange(reader);
                }

                return null;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Authorization // DelegationMetadataRepository // Insert // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<DelegationChange> GetCurrentDelegationChange(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId)
        {
            try
            {
                await using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getCurrentDelegationChangeSql, conn);
                pgcom.Parameters.AddWithValue("_altinnAppId", altinnAppId);
                pgcom.Parameters.AddWithValue("_offeredByPartyId", offeredByPartyId);
                pgcom.Parameters.AddWithValue("_coveredByUserId", coveredByUserId.HasValue ? coveredByUserId.Value : DBNull.Value);
                pgcom.Parameters.AddWithValue("_coveredByPartyId", coveredByPartyId.HasValue ? coveredByPartyId.Value : DBNull.Value);

                using NpgsqlDataReader reader = pgcom.ExecuteReader();
                if (reader.Read())
                {
                    return GetDelegationChange(reader);
                }

                return null;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Authorization // DelegationMetadataRepository // GetCurrentDelegationChange // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<List<DelegationChange>> GetAllDelegationChanges(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId)
        {
            try
            {
                await using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getAllDelegationChangesSql, conn);
                pgcom.Parameters.AddWithValue("_altinnAppId", altinnAppId);
                pgcom.Parameters.AddWithValue("_offeredByPartyId", offeredByPartyId);
                pgcom.Parameters.AddWithValue("_coveredByUserId", coveredByUserId.HasValue ? coveredByUserId.Value : DBNull.Value);
                pgcom.Parameters.AddWithValue("_coveredByPartyId", coveredByPartyId.HasValue ? coveredByPartyId.Value : DBNull.Value);

                List<DelegationChange> delegationChanges = new List<DelegationChange>();

                using NpgsqlDataReader reader = pgcom.ExecuteReader();
                while (reader.Read())
                {
                    delegationChanges.Add(GetDelegationChange(reader));
                }

                return delegationChanges;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Authorization // DelegationMetadataRepository // GetAllDelegationChanges // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<List<DelegationChange>> GetAllCurrentDelegationChanges(List<int> offeredByPartyIds, List<string> altinnAppIds = null, List<int> coveredByPartyIds = null, List<int> coveredByUserIds = null)
        {
            List<DelegationChange> delegationChanges = new List<DelegationChange>();
            CheckIfOfferedbyPartyIdsHasValue(offeredByPartyIds);

            if (coveredByPartyIds == null && coveredByUserIds == null)
            {
                delegationChanges.AddRange(await GetAllCurrentDelegationChangesOfferedByPartyIdOnly(altinnAppIds, offeredByPartyIds));
            }
            else
            {
                if (coveredByPartyIds?.Count > 0)
                {
                    delegationChanges.AddRange(await GetAllCurrentDelegationChangesCoveredByPartyIds(altinnAppIds, offeredByPartyIds, coveredByPartyIds));
                }

                if (coveredByUserIds?.Count > 0)
                {
                    delegationChanges.AddRange(await GetAllCurrentDelegationChangesCoveredByUserIds(altinnAppIds, offeredByPartyIds, coveredByUserIds));
                }
            }

            return delegationChanges;
        }

        private static void CheckIfOfferedbyPartyIdsHasValue(List<int> offeredByPartyIds)
        {
            if (offeredByPartyIds == null)
            {
                throw new ArgumentNullException(nameof(offeredByPartyIds));
            }
            else if (offeredByPartyIds.Count == 0)
            {
                throw new ArgumentOutOfRangeException(nameof(offeredByPartyIds));
            }
        }

        private static DelegationChange GetDelegationChange(NpgsqlDataReader reader)
        {
            return new DelegationChange
            {
                DelegationChangeId = reader.GetValue<int>("delegationchangeid"),
                DelegationChangeType = reader.GetValue<DelegationChangeType>("delegationchangetype"),
                AltinnAppId = reader.GetValue<string>("altinnappid"),
                OfferedByPartyId = reader.GetValue<int>("offeredbypartyid"),
                CoveredByPartyId = reader.GetValue<int>("coveredbypartyid"),
                CoveredByUserId = reader.GetValue<int>("coveredbyuserid"),
                PerformedByUserId = reader.GetValue<int>("performedbyuserid"),
                BlobStoragePolicyPath = reader.GetValue<string>("blobstoragepolicypath"),
                BlobStorageVersionId = reader.GetValue<string>("blobstorageversionid"),
                Created = reader.GetValue<DateTime>("created")
            };
        }

        private async Task<List<DelegationChange>> GetAllCurrentDelegationChangesCoveredByPartyIds(List<string> altinnAppIds = null, List<int> offeredByPartyIds = null, List<int> coveredByPartyIds = null)
        {
            try
            {
                await using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getAllCurrentDelegationChangesPartyIdsSql, conn);
                pgcom.Parameters.AddWithValue("_altinnAppIds", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Text, altinnAppIds?.Count > 0 ? altinnAppIds : DBNull.Value);
                pgcom.Parameters.AddWithValue("_offeredByPartyIds", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Integer, offeredByPartyIds);
                pgcom.Parameters.AddWithValue("_coveredByPartyIds", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Integer, coveredByPartyIds);

                List<DelegationChange> delegationChanges = new List<DelegationChange>();

                using NpgsqlDataReader reader = pgcom.ExecuteReader();
                while (reader.Read())
                {
                    delegationChanges.Add(GetDelegationChange(reader));
                }

                return delegationChanges;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Authorization // DelegationMetadataRepository // GetAllCurrentDelegationChangesCoveredByPartyIds // Exception");
                throw;
            }
        }

        private async Task<List<DelegationChange>> GetAllCurrentDelegationChangesCoveredByUserIds(List<string> altinnAppIds = null, List<int> offeredByPartyIds = null, List<int> coveredByUserIds = null)
        {
            try
            {
                await using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getAllCurrentDelegationChangesUserIdsSql, conn);
                pgcom.Parameters.AddWithValue("_altinnAppIds", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Text, altinnAppIds?.Count > 0 ? altinnAppIds : DBNull.Value);
                pgcom.Parameters.AddWithValue("_offeredByPartyIds", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Integer, offeredByPartyIds);
                pgcom.Parameters.AddWithValue("_coveredByUserIds", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Integer, coveredByUserIds);

                List<DelegationChange> delegationChanges = new List<DelegationChange>();

                using NpgsqlDataReader reader = pgcom.ExecuteReader();
                while (reader.Read())
                {
                    delegationChanges.Add(GetDelegationChange(reader));
                }

                return delegationChanges;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Authorization // DelegationMetadataRepository // GetAllCurrentDelegationChangesCoveredByUserIds // Exception");
                throw;
            }
        }

        private async Task<List<DelegationChange>> GetAllCurrentDelegationChangesOfferedByPartyIdOnly(List<string> altinnAppIds = null, List<int> offeredByPartyIds = null)
        {
            try
            {
                await using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getAllCurrentDelegationChangesOfferedByPartyIdOnlysSql, conn);
                pgcom.Parameters.AddWithValue("_altinnAppIds", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Text, altinnAppIds?.Count > 0 ? altinnAppIds : DBNull.Value);
                pgcom.Parameters.AddWithValue("_offeredByPartyIds", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Integer, offeredByPartyIds);

                List<DelegationChange> delegationChanges = new List<DelegationChange>();

                using NpgsqlDataReader reader = pgcom.ExecuteReader();
                while (reader.Read())
                {
                    delegationChanges.Add(GetDelegationChange(reader));
                }

                return delegationChanges;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Authorization // DelegationMetadataRepository // GetAllCurrentDelegationChangesOfferedByPartyIdOnly // Exception");
                throw;
            }
        }
    }
}
