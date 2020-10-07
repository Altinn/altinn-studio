using System.Data;
using System.Threading.Tasks;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository;
using Altinn.Platform.Events.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Altinn.Platform.Events.Services
{
    /// <summary>
    /// Something smart
    /// </summary>
    public class EventsPostgresService : IEventsPostgresService
    {
        private NpgsqlConnection _conn;
        private readonly ILogger _logger;

        /// <summary>
        /// Something smart
        /// </summary>
        public EventsPostgresService(IOptions<PostgresSettings> postgresSettings, ILogger<EventsPostgresService> logger)
        {
            PostgresDatabaseHandler database = new PostgresDatabaseHandler(postgresSettings.Value);
            _conn = database.GetConnection();
            _logger = logger;

        }

        /// <summary>
        /// Something smart
        /// </summary>
        public int StoreItemtToEventsCollection(CloudEvent cloudEvent)
        {
            _conn.Open();
            string sql = "CALL events.insert_event";
            NpgsqlCommand pgcom = new NpgsqlCommand(sql, _conn);
            pgcom.CommandType = CommandType.StoredProcedure;
            pgcom.Parameters.AddWithValue("id", "id1");
            pgcom.Parameters.AddWithValue("source", "source1");
            pgcom.Parameters.AddWithValue("subject", "subject1");
            pgcom.Parameters.AddWithValue("type", "type1");
            pgcom.Parameters.AddWithValue("cloudevent", "cloudevent1");
            int result = pgcom.ExecuteNonQuery();
            _conn.Close();
            return result;
            
/*             NpgsqlCommand pgcom = new NpgsqlCommand("SELECT * FROM events.events", _conn);
            NpgsqlDataReader dr = pgcom.ExecuteReader();
            while(dr.Read()) 
            {
                _logger.LogInformation("0: " + dr[0] + ", 1: " + dr[1]);
            } */
            
            //return 1;

        }
    }
}