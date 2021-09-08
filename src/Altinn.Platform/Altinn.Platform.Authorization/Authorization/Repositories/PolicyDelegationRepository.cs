using System;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Repositories.Interface;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Altinn.Platform.Authorization.Repositories
{
    /// <summary>
    /// Repository implementation for PostgreSQL operations on delegations.
    /// </summary>
    public class PolicyDelegationRepository : IPolicyDelegationRepository
    {
        private readonly string _connectionString;
        private readonly AzureStorageConfiguration _storageConfig;
        private readonly ILogger _logger;
        private readonly string insertDelegationChangeSql = "call delegation.insert_change(@_altinnAppId, @_offeredByPartyId, @_coveredByUserId, @_coveredByPartyId, @_performingUserId, @_blobStoragePolicyPath, @_blobStorageVersionId, @_policyChangeId)";
        private readonly string getCurrentDelegationChangeSql = "select delegation.get_current_change(@_altinnAppId, @_offeredByPartyId, @_coveredByUserId, @_coveredByPartyId)";
        private readonly string getAllDelegationChangesSql = "select delegation.get_all_changes(@_altinnAppId, @_offeredByPartyId, @_coveredByUserId, @_coveredByPartyId)";

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyDelegationRepository"/> class
        /// </summary>
        /// <param name="postgresSettings">The postgreSQL configurations for AuthorizationDB</param>
        /// <param name="logger">logger</param>
        public PolicyDelegationRepository(
            IOptions<PostgreSQLSettings> postgresSettings,
            ILogger<PolicyDelegationRepository> logger)
        {
            _logger = logger;
            _connectionString = string.Format(
                postgresSettings.Value.ConnectionString,
                postgresSettings.Value.EventsDbPwd);
        }

        /// <inheritdoc/>
        public async Task<bool> InsertDelegation(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId, int delegatedByUserId, string blobStoragePolicyPath, string blobStorageVersionId)
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
                pgcom.Parameters.AddWithValue("_performingUserId", delegatedByUserId);
                pgcom.Parameters.AddWithValue("_blobStoragePolicyPath", blobStoragePolicyPath);
                pgcom.Parameters.AddWithValue("_blobStorageVersionId", blobStorageVersionId);

                pgcom.Parameters.AddWithValue("_policyChangeId", 0); // Must be included since it's specified in stored proc, but so far unable to get inserted value back.

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
        public async void GetCurrentDelegationChange(string altinnAppId, int offeredByPartyId, int coveredByPartyId, int coveredByUserId)
        {
            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getCurrentDelegationChangeSql, conn);
                pgcom.Parameters.AddWithValue("_altinnAppId", altinnAppId);
                pgcom.Parameters.AddWithValue("_offeredByPartyId", offeredByPartyId);
                pgcom.Parameters.AddWithValue("_coveredByUserId", coveredByUserId != 0 ? coveredByUserId : DBNull.Value);
                pgcom.Parameters.AddWithValue("_coveredByPartyId", coveredByPartyId != 0 ? coveredByPartyId : DBNull.Value);

                string res = string.Empty;
                using NpgsqlDataReader reader = pgcom.ExecuteReader();
                while (reader.Read())
                {
                    res = reader[0].ToString();
                }

                ////return new List<?>();
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Authorization // PostgresRepository // GetCurrentDelegationChange // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async void GetAllDelegationChanges(string altinnAppId, int offeredByPartyId, int coveredByPartyId, int coveredByUserId)
        {
            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getAllDelegationChangesSql, conn);
                pgcom.Parameters.AddWithValue("_altinnAppId", altinnAppId);
                pgcom.Parameters.AddWithValue("_offeredByPartyId", offeredByPartyId);
                pgcom.Parameters.AddWithValue("_coveredByUserId", coveredByUserId != 0 ? coveredByUserId : DBNull.Value);
                pgcom.Parameters.AddWithValue("_coveredByPartyId", coveredByPartyId != 0 ? coveredByPartyId : DBNull.Value);

                string res = string.Empty;
                using NpgsqlDataReader reader = pgcom.ExecuteReader();
                while (reader.Read())
                {
                    res = reader[0].ToString();
                }

                ////return new List<?>();
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Authorization // PostgresRepository // GetAllDelegationChanges // Exception");
                throw;
            }
        }
    }
}
