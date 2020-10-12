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
    public class EventsPostgresRepository : IEventsPostgresRepository
    {
        private NpgsqlConnection _conn;
        private readonly ILogger _logger;
        private readonly string insertEventSql = "call events.insert_event(@id, @source, @subject, @type, @cloudevent)";

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsPostgresRepository"/> class.
        /// </summary>
        public EventsPostgresRepository(IOptions<PostgreSQLSettings> postgresSettings, ILogger<EventsPostgresRepository> logger)
        {
            PostgresDatabaseHandler database = new PostgresDatabaseHandler(postgresSettings.Value);
            _conn = database.GetConnection();
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<string> Create(CloudEvent cloudEvent)
        {
            await _conn.OpenAsync();

            NpgsqlCommand pgcom = new NpgsqlCommand(insertEventSql, _conn);
            pgcom.Parameters.AddWithValue("id", cloudEvent.Id);
            pgcom.Parameters.AddWithValue("source", cloudEvent.Source.OriginalString);
            pgcom.Parameters.AddWithValue("subject", cloudEvent.Subject);
            pgcom.Parameters.AddWithValue("type", cloudEvent.Type);
            pgcom.Parameters.AddWithValue("cloudevent", SerializeCloudEvent(cloudEvent));

            await pgcom.ExecuteNonQueryAsync();
            await _conn.CloseAsync();

            return cloudEvent.Id;
        }

        private string SerializeCloudEvent(CloudEvent cloudEvent)
        {
            return JsonSerializer.Serialize(cloudEvent);
        }
    }
}