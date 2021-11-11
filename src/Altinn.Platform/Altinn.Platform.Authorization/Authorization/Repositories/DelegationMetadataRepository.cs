using System;
using System.Collections.Generic;
using System.Linq;
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
        private readonly string insertDelegationChangeSql = "call delegation.insert_change(@_altinnAppId, @_offeredByPartyId, @_coveredByUserId, @_coveredByPartyId, @_performedByUserId, @_blobStoragePolicyPath, @_blobStorageVersionId, @_isDeleted, @_delegationChangeId)";
        private readonly string getCurrentDelegationChangeSql = "select * from delegation.get_current_change(@_altinnAppId, @_offeredByPartyId, @_coveredByUserId, @_coveredByPartyId)";
        private readonly string getAllDelegationChangesSql = "select * from delegation.get_all_changes(@_altinnAppId, @_offeredByPartyId, @_coveredByUserId, @_coveredByPartyId)";
        private readonly string getAllCurrentDelegationChangesSql = "select * from delegation.get_all_current_changes(@_altinnAppIds, @_offeredByPartyIds, @_coveredByPartyIds, @_coveredByUserIds)";

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
        }

        /// <inheritdoc/>
        public async Task<bool> InsertDelegation(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId, int delegatedByUserId, string blobStoragePolicyPath, string blobStorageVersionId, bool isDeleted = false)
        {
            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(insertDelegationChangeSql, conn);
                pgcom.Parameters.AddWithValue("_altinnAppId", altinnAppId);
                pgcom.Parameters.AddWithValue("_offeredByPartyId", offeredByPartyId);
                pgcom.Parameters.AddWithValue("_coveredByUserId", coveredByUserId.HasValue ? coveredByUserId.Value : DBNull.Value);
                pgcom.Parameters.AddWithValue("_coveredByPartyId", coveredByPartyId.HasValue ? coveredByPartyId.Value : DBNull.Value);
                pgcom.Parameters.AddWithValue("_performedByUserId", delegatedByUserId);
                pgcom.Parameters.AddWithValue("_blobStoragePolicyPath", blobStoragePolicyPath);
                pgcom.Parameters.AddWithValue("_blobStorageVersionId", blobStorageVersionId);
                pgcom.Parameters.AddWithValue("_isDeleted", isDeleted);

                pgcom.Parameters.AddWithValue("_delegationChangeId", 0); // Must be included since it's specified in stored proc, but so far unable to get inserted value back.

                await pgcom.ExecuteNonQueryAsync();

                return true;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Authorization // PostgresRepository // Insert // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<DelegationChange> GetCurrentDelegationChange(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId)
        {
            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
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
                _logger.LogError(e, "Authorization // PostgresRepository // GetCurrentDelegationChange // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<List<DelegationChange>> GetAllDelegationChanges(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId)
        {
            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
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
                _logger.LogError(e, "Authorization // PostgresRepository // GetAllDelegationChanges // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<List<DelegationChange>> GetAllCurrentDelegationChanges(List<string> altinnAppIds, List<int> offeredByPartyIds, List<int> coveredByPartyIds, List<int> coveredByUserIds)
        {
            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getAllCurrentDelegationChangesSql, conn);
                pgcom.Parameters.AddWithValue("_altinnAppIds", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Text, altinnAppIds);
                pgcom.Parameters.AddWithValue("_offeredByPartyIds", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Integer, offeredByPartyIds);
                pgcom.Parameters.AddWithValue("_coveredByPartyIds", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Integer, coveredByPartyIds.Count > 0 ? coveredByPartyIds : DBNull.Value);
                pgcom.Parameters.AddWithValue("_coveredByUserIds", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Integer, coveredByUserIds.Count > 0 ? coveredByUserIds : DBNull.Value);

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
                _logger.LogError(e, "Authorization // PostgresRepository // GetAllDelegationChanges // Exception");
                throw;
            }
        }

        private static DelegationChange GetDelegationChange(NpgsqlDataReader reader)
        {
            DelegationChange delegationChange = new DelegationChange();
            delegationChange.PolicyChangeId = reader.GetValue<int>("delegationchangeid");
            delegationChange.AltinnAppId = reader.GetValue<string>("altinnappid");
            delegationChange.OfferedByPartyId = reader.GetValue<int>("offeredbypartyid");
            delegationChange.CoveredByPartyId = reader.GetValue<int>("coveredbypartyid");
            delegationChange.CoveredByUserId = reader.GetValue<int>("coveredbyuserid");
            delegationChange.PerformedByUserId = reader.GetValue<int>("performedbyuserid");
            delegationChange.BlobStoragePolicyPath = reader.GetValue<string>("blobstoragepolicypath");
            delegationChange.BlobStorageVersionId = reader.GetValue<string>("blobstorageversionid");
            delegationChange.IsDeleted = reader.GetValue<bool>("isdeleted");
            delegationChange.Created = reader.GetValue<DateTime>("created");
            return delegationChange;
        }
    }
}
