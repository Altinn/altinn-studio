using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Repository.Models;
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
    public class DeploymentRepositoryPostgres : IDeploymentRepositoryPostgres
    {
        private readonly string insertDeploymentSql = "call designer.insert_deployment(@id, @tagName, @org, @app, @buildId, @buildResult, @created, @entity)";
        private readonly string getDeploymentsSql = "select designer.get_deployments(@_org, @_app, @_limit, @_order_asc_desc)";
        private readonly string getDeploymentSql = "select designer.get_deployment(@_org, @_buildId)";
        private readonly string updateDeploymentBuildSql = "call designer.update_deployment_build(@_id, @_buildResult, @_entity)";
        private readonly string _connectionString;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DeploymentRepositoryPostgres"/> class.
        /// </summary>
        public DeploymentRepositoryPostgres(IOptions<PostgreSQLSettings> postgresSettings, ILogger<DeploymentRepositoryPostgres> logger)
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
                pgcom.Parameters.AddWithValue("id", deploymentEntity.Id);
                pgcom.Parameters.AddWithValue("tagName", deploymentEntity.TagName);
                pgcom.Parameters.AddWithValue("org", deploymentEntity.Org);
                pgcom.Parameters.AddWithValue("app", deploymentEntity.App);
                pgcom.Parameters.AddWithValue("buildId", deploymentEntity.Build.Id);
                pgcom.Parameters.AddWithValue("buildResult", deploymentEntity.Build.Result);
                pgcom.Parameters.AddWithValue("created", deploymentEntity.Created);
                pgcom.Parameters.AddWithValue("entity", JsonString(deploymentEntity));

                await pgcom.ExecuteNonQueryAsync();

                return deploymentEntity;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "DeploymentRepositoryPostgres // Create // Exception");
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
                _logger.LogError(e, "DeploymentRepositoryPostgres // Get(DocumentQueryModel) // Exception");
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
                pgcom.Parameters.AddWithValue("_buildId", NpgsqlDbType.Varchar, buildId);

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
                _logger.LogError(e, "DeploymentRepositoryPostgres // Get(string org, string buildId) // Exception");
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

                NpgsqlCommand pgcom = new NpgsqlCommand(insertDeploymentSql, conn);
                pgcom.Parameters.AddWithValue("_id", deploymentEntity.Id);
                pgcom.Parameters.AddWithValue("_buildResult", deploymentEntity.Build.Result);
                pgcom.Parameters.AddWithValue("_entity", JsonString(deploymentEntity));

                await pgcom.ExecuteNonQueryAsync();
            }
            catch (Exception e)
            {
                _logger.LogError(e, "DeploymentRepositoryPostgres // Update // Exception");
                throw;
            }
        }

        private string JsonString(DeploymentEntity deploymentEntity)
        {
            return JsonConvert.SerializeObject(deploymentEntity);
        }

        private DeploymentEntity Deserialize(string deploymentEntityString)
        {
            return JsonConvert.DeserializeObject<DeploymentEntity>(deploymentEntityString);
        }
    }
}