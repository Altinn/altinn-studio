using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using NpgsqlTypes;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Handles events repository. 
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class PostgresRepository : IPostgresRepository
    {
        private readonly NpgsqlConnection _conn;
        private readonly ILogger _logger;
        private readonly string insertEventSql = "call events.insert_event(@id, @source, @subject, @type, @cloudevent)";
        private readonly string getEventSql = "select events.get(@_subject, @_after, @_from, @_to, @_type, @_source)";

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
                pgcom.Parameters.AddWithValue("cloudevent", item.Serialize());

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

        /// <inheritdoc/>
        public async Task<List<CloudEvent>> Get(string after, DateTime? from, DateTime? to, string subject, List<string> source, List<string> type, int size)
        {
            List<CloudEvent> searchResult = new List<CloudEvent>();
            int index = 0;

            try
            {
                await _conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getEventSql, _conn);
                pgcom.Parameters.AddWithValue("_subject", NpgsqlDbType.Varchar, subject);
                pgcom.Parameters.AddWithValue("_after", NpgsqlDbType.Varchar, after);
                pgcom.Parameters.AddWithValue("_from", NpgsqlDbType.TimestampTz, from ?? (object)DBNull.Value);
                pgcom.Parameters.AddWithValue("_to", NpgsqlDbType.TimestampTz, to ?? (object)DBNull.Value);
                pgcom.Parameters.AddWithValue("_source", NpgsqlDbType.Array | NpgsqlDbType.Text, source ?? (object)DBNull.Value);
                pgcom.Parameters.AddWithValue("_type", NpgsqlDbType.Array | NpgsqlDbType.Text, type ?? (object)DBNull.Value);

                using (NpgsqlDataReader reader = pgcom.ExecuteReader())
                {
                    while (reader.Read() && index < size)
                    {
                        CloudEvent cloudEvent = CloudEvent.Deserialize(reader[0].ToString());
                        cloudEvent.Time = cloudEvent.Time.Value.ToUniversalTime();
                        searchResult.Add(cloudEvent);
                        ++index;
                    }
                }

                return searchResult;
            }
            catch (Exception e)
            {
                Console.WriteLine($" PostgresRepository // Get // Exception {JsonSerializer.Serialize(e)}");
                throw;
            }
            finally
            {
                await _conn.CloseAsync();
            }
        }
    }
}
