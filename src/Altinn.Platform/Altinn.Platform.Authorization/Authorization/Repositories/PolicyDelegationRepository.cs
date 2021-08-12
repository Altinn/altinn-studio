using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Repositories.Interface;
using Azure.Storage;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Altinn.Platform.Authorization.Repositories
{
    /// <summary>
    /// Repository for handling delegations
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
        /// <param name="storageConfig">The storage configuration for Azure Blob Storage.</param>
        /// <param name="postgresSettings">The postgreSQL configurations for AuthorizationDB</param>
        /// <param name="logger">logger</param>
        public PolicyDelegationRepository(
            IOptions<AzureStorageConfiguration> storageConfig,
            IOptions<PostgreSQLSettings> postgresSettings,
            ILogger<PolicyDelegationRepository> logger)
        {
            _logger = logger;
            _storageConfig = storageConfig.Value;
            _connectionString = string.Format(
                postgresSettings.Value.ConnectionString,
                postgresSettings.Value.EventsDbPwd);
        }

        /// <inheritdoc />
        public async Task<Stream> GetDelegationPolicyAsync(string filepath)
        {
            BlobClient blockBlob = CreateBlobClient(filepath);
            Stream memoryStream = new MemoryStream();

            if (await blockBlob.ExistsAsync())
            {
                await blockBlob.DownloadToAsync(memoryStream);
                memoryStream.Position = 0;

                return memoryStream;
            }

            return memoryStream;
        }

        /// <inheritdoc />
        public async Task<bool> WriteDelegationPolicyAsync(string filepath, Stream fileStream)
        {
            try
            {
                BlobClient blockBlob = CreateBlobClient(filepath);

                await blockBlob.UploadAsync(fileStream, true);
                BlobProperties properties = await blockBlob.GetPropertiesAsync();

                return properties.ContentLength > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to save delegation policy file {filepath}. " + ex);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<bool> InsertDelegation(string altinnAppId, int offeredByPartyId, int coveredByPartyId, int coveredByUserId, int delegatedByUserId, string blobStoragePolicyPath, string blobStorageVersionId)
        {
            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(insertDelegationChangeSql, conn);
                pgcom.Parameters.AddWithValue("_altinnAppId", altinnAppId);
                pgcom.Parameters.AddWithValue("_offeredByPartyId", offeredByPartyId);
                pgcom.Parameters.AddWithValue("_coveredByUserId", coveredByUserId != 0 ? coveredByUserId : DBNull.Value);
                pgcom.Parameters.AddWithValue("_coveredByPartyId", coveredByPartyId != 0 ? coveredByPartyId : DBNull.Value);
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
        public async Task<DelegatedPolicy> GetCurrentDelegationChange(string altinnAppId, int offeredByPartyId, int coveredByPartyId, int coveredByUserId)
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

                return new DelegatedPolicy();
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Authorization // PostgresRepository // GetCurrentDelegationChange // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<List<DelegatedPolicy>> GetAllDelegationChanges(string altinnAppId, int offeredByPartyId, int coveredByPartyId, int coveredByUserId)
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

                return new List<DelegatedPolicy>();
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Authorization // PostgresRepository // GetAllDelegationChanges // Exception");
                throw;
            }
        }

        private BlobClient CreateBlobClient(string blobName)
        {
            StorageSharedKeyCredential storageCredentials = new StorageSharedKeyCredential(_storageConfig.AccountName, _storageConfig.AccountKey);
            BlobServiceClient serviceClient = new BlobServiceClient(new Uri(_storageConfig.BlobEndpoint), storageCredentials);
            BlobContainerClient blobContainerClient = serviceClient.GetBlobContainerClient(_storageConfig.MetadataContainer);

            return blobContainerClient.GetBlobClient(blobName);
        }
    }
}
