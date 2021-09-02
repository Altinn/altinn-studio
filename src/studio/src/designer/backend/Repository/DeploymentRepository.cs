using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
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
    /// Handles deployment repository. 
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class DeploymentRepository : IDeploymentRepository
    {
        private readonly string insertDeploymentSql = "call designer.insert_deployment(@buildid, @tagName, @org, @app, @buildresult, @created, @entity)";
        private readonly string getDeploymentsSql = "select designer.get_deployments(@_org, @_app, @_limit, @_order_asc_desc)";
        private readonly string getDeploymentSql = "select designer.get_deployment(@_org, @_buildid)";
        private readonly string updateDeploymentBuildSql = "call designer.update_deployment_build(@_org, @_buildid, @_buildresult, @_entity)";
        private readonly string _connectionString;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DeploymentRepository"/> class.
        /// </summary>
        public DeploymentRepository(IOptions<PostgreSQLSettings> postgresSettings, ILogger<DeploymentRepository> logger)
        {
            _connectionString = string.Format(
                postgresSettings.Value.ConnectionString,
                postgresSettings.Value.DesignerDbPwd);
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<DeploymentEntity> Create(DeploymentEntity deploymentEntity)
        {
            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(insertDeploymentSql, conn);
                pgcom.Parameters.AddWithValue("buildid", deploymentEntity.Build.Id);
                pgcom.Parameters.AddWithValue("tagName", deploymentEntity.TagName);
                pgcom.Parameters.AddWithValue("org", deploymentEntity.Org);
                pgcom.Parameters.AddWithValue("app", deploymentEntity.App);
                pgcom.Parameters.AddWithValue("buildresult", deploymentEntity.Build.Result.ToEnumMemberAttributeValue());
                pgcom.Parameters.AddWithValue("created", deploymentEntity.Created);
                pgcom.Parameters.AddWithValue("entity", JsonString(deploymentEntity));

                await pgcom.ExecuteNonQueryAsync();

                return deploymentEntity;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "DeploymentRepository // Create // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<DeploymentEntity>> Get(DocumentQueryModel query)
        {
            List<DeploymentEntity> searchResult = new List<DeploymentEntity>();

            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getDeploymentsSql, conn);
                pgcom.Parameters.AddWithValue("_org", NpgsqlDbType.Varchar, query.Org);
                pgcom.Parameters.AddWithValue("_app", NpgsqlDbType.Varchar, query.App);
                pgcom.Parameters.AddWithValue("_limit", NpgsqlDbType.Integer, query.Top ?? int.MaxValue);
                pgcom.Parameters.AddWithValue("_order_asc_desc", NpgsqlDbType.Varchar, query.SortDirection == SortDirection.Ascending ? "asc" : "desc");

                using (NpgsqlDataReader reader = pgcom.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        DeploymentEntity deploymentEntity = Deserialize(reader[0].ToString());
                        searchResult.Add(deploymentEntity);
                    }
                }

                return searchResult;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "DeploymentRepository // Get(DocumentQueryModel) // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<DeploymentEntity> Get(string org, string buildId)
        {
            try
            {
                DeploymentEntity deploymentEntity = null;
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getDeploymentSql, conn);
                pgcom.Parameters.AddWithValue("_org", NpgsqlDbType.Varchar, org);
                pgcom.Parameters.AddWithValue("_buildid", NpgsqlDbType.Varchar, buildId);

                using (NpgsqlDataReader reader = pgcom.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        deploymentEntity = Deserialize(reader[0].ToString());
                    }
                }

                return deploymentEntity;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "DeploymentRepository // Get(string org, string buildId) // Exception");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task Update(DeploymentEntity deploymentEntity)
        {
            try
            {
                using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(updateDeploymentBuildSql, conn);
                pgcom.Parameters.AddWithValue("_org", deploymentEntity.Org);
                pgcom.Parameters.AddWithValue("_buildid", deploymentEntity.Build.Id);
                pgcom.Parameters.AddWithValue("_buildresult", deploymentEntity.Build.Result.ToEnumMemberAttributeValue());
                pgcom.Parameters.AddWithValue("_entity", JsonString(deploymentEntity));

                await pgcom.ExecuteNonQueryAsync();
            }
            catch (Exception e)
            {
                _logger.LogError(e, "DeploymentRepository // Update // Exception");
                throw;
            }
        }

        private static string JsonString(DeploymentEntity deploymentEntity)
        {
            return JsonConvert.SerializeObject(deploymentEntity);
        }

        private static DeploymentEntity Deserialize(string deploymentEntityString)
        {
            return JsonConvert.DeserializeObject<DeploymentEntity>(deploymentEntityString);
        }
    }
}
