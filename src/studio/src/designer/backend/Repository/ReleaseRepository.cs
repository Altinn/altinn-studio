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
    public class ReleaseRepository : IReleaseRepository
    {
        private readonly string insertReleaseSql = "call designer.insert_release(@buildid, @tagname, @org, @app, @buildstatus, @buildresult, @created, @entity)";
        private readonly string getReleasesSql = "select designer.get_releases(@_org, @_app, @_limit, @_order_asc_desc)";
        private readonly string checkExistingReleaseSql = "select designer.check_existing_release(@_org, @_app, @_tagname, @_buildstatus, @_buildresult)";
        private readonly string getReleaseSql = "select designer.get_release(@_org, @_buildid)";
        private readonly string updateReleaseBuildSql = "call designer.update_release_build(@_org, @build_id, @_buildstatus, @_buildresult, @_entity)";
        private readonly string _connectionString;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ReleaseRepository"/> class.
        /// </summary>
        public ReleaseRepository(IOptions<PostgreSQLSettings> postgresSettings, ILogger<ReleaseRepository> logger)
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
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(insertReleaseSql, conn);
                pgcom.Parameters.AddWithValue("buildid", releaseEntity.Build.Id);
                pgcom.Parameters.AddWithValue("tagname", releaseEntity.TagName);
                pgcom.Parameters.AddWithValue("org", releaseEntity.Org);
                pgcom.Parameters.AddWithValue("app", releaseEntity.App);
                pgcom.Parameters.AddWithValue("buildstatus", releaseEntity.Build.Status.ToEnumMemberAttributeValue());
                pgcom.Parameters.AddWithValue("buildresult", releaseEntity.Build.Result.ToEnumMemberAttributeValue());
                pgcom.Parameters.AddWithValue("created", releaseEntity.Created);
                pgcom.Parameters.AddWithValue("entity", JsonString(releaseEntity));

                await pgcom.ExecuteNonQueryAsync();

                return releaseEntity;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "ReleaseRepository // Create // Exception");
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
                _logger.LogError(e, "ReleaseRepository // Get(DocumentQueryModel) // Exception");
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
                pgcom.Parameters.AddWithValue("_tagname", NpgsqlDbType.Varchar, tagName);
                pgcom.Parameters.AddWithValue("_buildstatus", NpgsqlDbType.Array | NpgsqlDbType.Text, buildStatus ?? (object)DBNull.Value);
                pgcom.Parameters.AddWithValue("_buildresult", NpgsqlDbType.Array | NpgsqlDbType.Text, buildResult ?? (object)DBNull.Value);

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
                _logger.LogError(e, "ReleaseRepository // Get(DocumentQueryModel) // Exception");
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
                pgcom.Parameters.AddWithValue("_buildid", NpgsqlDbType.Varchar, buildId);

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
                _logger.LogError(e, "ReleaseRepository // Get(string org, string buildId) // Exception");
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
                pgcom.Parameters.AddWithValue("_org", releaseEntity.Org);
                pgcom.Parameters.AddWithValue("_buildid", releaseEntity.Build.Id);
                pgcom.Parameters.AddWithValue("_buildstatus", releaseEntity.Build.Status);
                pgcom.Parameters.AddWithValue("_buildresult", releaseEntity.Build.Result.ToEnumMemberAttributeValue());
                pgcom.Parameters.AddWithValue("_entity", JsonString(releaseEntity));

                await pgcom.ExecuteNonQueryAsync();
            }
            catch (Exception e)
            {
                _logger.LogError(e, "ReleaseRepository // Update // Exception");
                throw;
            }
        }

        private static string JsonString(ReleaseEntity releaseEntity)
        {
            return JsonConvert.SerializeObject(releaseEntity);
        }

        private static ReleaseEntity Deserialize(string releaseEntityString)
        {
            return JsonConvert.DeserializeObject<ReleaseEntity>(releaseEntityString);
        }
    }
}
