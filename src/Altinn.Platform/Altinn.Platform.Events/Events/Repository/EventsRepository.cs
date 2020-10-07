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
        public string Create(CloudEvent item, string cloudEvent)
        {
            _conn.Open();
            string sql = "call events.insert_event(@id, @source, @subject, @type, @cloudevent)";

            NpgsqlCommand pgcom = new NpgsqlCommand(sql, _conn);
            pgcom.Parameters.AddWithValue("id", item.Id);
            pgcom.Parameters.AddWithValue("source", item.Source.OriginalString);
            pgcom.Parameters.AddWithValue("subject", item.Subject);
            pgcom.Parameters.AddWithValue("type", item.Type);
            pgcom.Parameters.AddWithValue("cloudevent", cloudEvent);
            pgcom.ExecuteNonQuery();
            _conn.Close();
            return item.Id;
        }
    }
}