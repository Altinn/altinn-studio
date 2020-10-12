using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Handles events repository. 
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class PostgresRepository : IPostgresRepository
    {
        private NpgsqlConnection _conn;
        private readonly ILogger _logger;
        private readonly string insertEventSql = "call events.insert_event(@id, @source, @subject, @type, @cloudevent)";

        /// <summary>
        /// Initializes a new instance of the <see cref="PostgresRepository"/> class.
        /// </summary>
        public PostgresRepository(IOptions<PostgreSQLSettings> postgresSettings, ILogger<PostgresRepository> logger)
        {
            string connectionString = string.Format(
                postgresSettings.Value.ConnectionString, 
                postgresSettings.Value.EventsDbPwd);
            _conn = new NpgsqlConnection(connectionString);
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<string> Create(CloudEvent item)
        {
            try
            {
                await _conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(insertEventSql, _conn);
                pgcom.Parameters.AddWithValue("id", item.Id);
                pgcom.Parameters.AddWithValue("source", item.Source.OriginalString);
                pgcom.Parameters.AddWithValue("subject", item.Subject);
                pgcom.Parameters.AddWithValue("type", item.Type);
                pgcom.Parameters.AddWithValue("cloudevent", SerializeCloudEvent(item));

                await pgcom.ExecuteNonQueryAsync();

                return item.Id;
            }
            catch (Exception e)
            {
                _logger.LogError("PostgresRepository // Create // Exception", e);
                throw;
            }
            finally
            {
                await _conn.CloseAsync();
            }
        }

        private string SerializeCloudEvent(CloudEvent cloudEvent)
        {
            return JsonSerializer.Serialize(cloudEvent);
        }
    }
}