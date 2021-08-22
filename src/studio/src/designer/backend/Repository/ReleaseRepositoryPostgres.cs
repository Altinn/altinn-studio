using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Request.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Npgsql;
using NpgsqlTypes;

namespace Altinn.Studio.Designer.Repository
{
    /// <summary>
    /// Handles release repository. 
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class ReleaseRepositoryPostgres : IReleaseRepositoryPostgres
    {
        private readonly string insertReleaseSql = "call designer.insert_release(@id, @tagName, @org, @app, @buildId, @buildStatus, @buildResult, @created, @entity)";
        private readonly string getReleasesSql = "select designer.get_releases(@_org, @_app, @_limit, @_order_asc_desc)";
        private readonly string checkExistingReleaseSql = "select designer.check_existing_release(@_org, @_app, @_tagName, @_buildStatus, @_buildResult)";
        private readonly string getReleaseSql = "select designer.get_release(@_org, @_buildId)";
        private readonly string updateReleaseBuildSql = "call designer.update_release_build(@_id, @_buildResult, @_entity)";
        private readonly string _connectionString;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ReleaseRepositoryPostgres"/> class.
        /// </summary>
        public ReleaseRepositoryPostgres(IOptions<PostgreSQLSettings> postgresSettings, ILogger<ReleaseRepositoryPostgres> logger)
        {
            _connectionString = string.Format(
                postgresSettings.Value.ConnectionString,
                postgresSettings.Value.DesignerDbPwd);
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<ReleaseEntity> Create(ReleaseEntity releaseEntity)
        {
            try
            {
                _logger.LogDebug("ReleasEntity: " + JsonString(releaseEntity));
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(insertReleaseSql, conn);
                pgcom.Parameters.AddWithValue("id", releaseEntity.Id);
                pgcom.Parameters.AddWithValue("tagName", releaseEntity.TagName);
                pgcom.Parameters.AddWithValue("org", releaseEntity.Org);
                pgcom.Parameters.AddWithValue("app", releaseEntity.App);
                pgcom.Parameters.AddWithValue("buildId", releaseEntity.Build.Id);
                pgcom.Parameters.AddWithValue("buildStatus", releaseEntity.Build.Status.ToEnumMemberAttributeValue());
                pgcom.Parameters.AddWithValue("buildResult", releaseEntity.Build.Result.ToEnumMemberAttributeValue());
                pgcom.Parameters.AddWithValue("created", releaseEntity.Created);
                pgcom.Parameters.AddWithValue("entity", JsonString(releaseEntity));

                await pgcom.ExecuteNonQueryAsync();

                return releaseEntity;
            }
            catch (Exception e)
            {
                _logger.LogError(e, JsonString(releaseEntity));
                _logger.LogError(e, "ReleaseRepositoryPostgres // Create // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<ReleaseEntity>> Get(DocumentQueryModel query)
        {
            List<ReleaseEntity> searchResult = new List<ReleaseEntity>();

            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getReleasesSql, conn);
                pgcom.Parameters.AddWithValue("_org", NpgsqlDbType.Varchar, query.Org);
                pgcom.Parameters.AddWithValue("_app", NpgsqlDbType.Varchar, query.App);
                pgcom.Parameters.AddWithValue("_limit", NpgsqlDbType.Integer, query.Top ?? int.MaxValue);
                pgcom.Parameters.AddWithValue("_order_asc_desc", NpgsqlDbType.Varchar, query.SortDirection == SortDirection.Ascending ? "asc" : "desc");

                using (NpgsqlDataReader reader = pgcom.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        ReleaseEntity releaseEntity = Deserialize(reader[0].ToString());
                        searchResult.Add(releaseEntity);
                    }
                }

                return searchResult;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "ReleaseRepositoryPostgres // Get(DocumentQueryModel) // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<ReleaseEntity>> Get(string org, string app, string tagName, List<string> buildStatus, List<string> buildResult)
        {
            List<ReleaseEntity> searchResult = new List<ReleaseEntity>();

            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(checkExistingReleaseSql, conn);
                pgcom.Parameters.AddWithValue("_org", NpgsqlDbType.Varchar, org);
                pgcom.Parameters.AddWithValue("_app", NpgsqlDbType.Varchar, app);
                pgcom.Parameters.AddWithValue("_tagName", NpgsqlDbType.Varchar, tagName);
                pgcom.Parameters.AddWithValue("_buildStatus", NpgsqlDbType.Array | NpgsqlDbType.Text, buildStatus ?? (object)DBNull.Value);
                pgcom.Parameters.AddWithValue("_buildResult", NpgsqlDbType.Array | NpgsqlDbType.Text, buildResult ?? (object)DBNull.Value);

                using (NpgsqlDataReader reader = pgcom.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        ReleaseEntity releaseEntity = Deserialize(reader[0].ToString());
                        searchResult.Add(releaseEntity);
                    }
                }

                return searchResult;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "ReleaseRepositoryPostgres // Get(DocumentQueryModel) // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<ReleaseEntity>> Get(string org, string buildId)
        {
            List<ReleaseEntity> searchResult = new List<ReleaseEntity>();

            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getReleaseSql, conn);
                pgcom.Parameters.AddWithValue("_org", NpgsqlDbType.Varchar, org);
                pgcom.Parameters.AddWithValue("_buildId", NpgsqlDbType.Varchar, buildId);

                using (NpgsqlDataReader reader = pgcom.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        ReleaseEntity releaseEntity = Deserialize(reader[0].ToString());
                        searchResult.Add(releaseEntity);
                    }
                }

                return searchResult;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "ReleaseRepositoryPostgres // Get(string org, string buildId) // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<ReleaseEntity> GetSucceededReleaseFromDb(string org, string app, string tagName)
        {
            List<string> buildResult = new List<string>();
            buildResult.Add(BuildResult.Succeeded.ToEnumMemberAttributeValue());

            IEnumerable<ReleaseEntity> releases = await Get(org, app, tagName, null, buildResult);
            return releases.Single();
        }

        /// <inheritdoc/>
        public async Task Update(ReleaseEntity releaseEntity)
        {
            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(updateReleaseBuildSql, conn);
                pgcom.Parameters.AddWithValue("_id", releaseEntity.Id);
                pgcom.Parameters.AddWithValue("_buildStatus", releaseEntity.Id);
                pgcom.Parameters.AddWithValue("_buildResult", releaseEntity.Build.Result.ToEnumMemberAttributeValue());
                pgcom.Parameters.AddWithValue("_entity", JsonString(releaseEntity));

                await pgcom.ExecuteNonQueryAsync();
            }
            catch (Exception e)
            {
                _logger.LogError(e, "ReleaseRepositoryPostgres // Update // Exception");
                throw;
            }
        }

        private string JsonString(ReleaseEntity releaseEntity)
        {
            return JsonConvert.SerializeObject(releaseEntity);
        }

        private ReleaseEntity Deserialize(string releaseEntityString)
        {
            return JsonConvert.DeserializeObject<ReleaseEntity>(releaseEntityString);
        }
    }
}