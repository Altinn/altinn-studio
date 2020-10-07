using System.Threading.Tasks;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Handles events repository. 
    /// </summary>
    public class EventsRepository : IEventsRepository
    {
        private NpgsqlConnection _conn;
        private readonly ILogger _logger;
        private readonly string insertEventSql = "call events.insert_event(@id, @source, @subject, @type, @cloudevent)";

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsRepository"/> class.
        /// </summary>
        public EventsRepository(IOptions<PostgresSettings> postgresSettings, ILogger<EventsRepository> logger)
        {
            PostgresDatabaseHandler database = new PostgresDatabaseHandler(postgresSettings.Value);
            _conn = database.GetConnection();
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<string> Create(CloudEvent item, string cloudEvent)
        {
            await _conn.OpenAsync();

            NpgsqlCommand pgcom = new NpgsqlCommand(insertEventSql, _conn);
            pgcom.Parameters.AddWithValue("id", item.Id);
            pgcom.Parameters.AddWithValue("source", item.Source.OriginalString);
            pgcom.Parameters.AddWithValue("subject", item.Subject);
            pgcom.Parameters.AddWithValue("type", item.Type);
            pgcom.Parameters.AddWithValue("cloudevent", cloudEvent);

            await pgcom.ExecuteNonQueryAsync();
            await _conn.CloseAsync();
            
            return item.Id;
        }
    }
}