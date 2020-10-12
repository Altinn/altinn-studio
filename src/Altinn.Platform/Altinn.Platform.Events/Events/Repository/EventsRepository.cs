using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Npgsql;
using NpgsqlTypes;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Handles events repository. Notice that the all methods should modify the Subject attribute of the
    /// CloudEvent, since cosmosDb fails if Subject contains slashes '/'.
    /// </summary>
    public class EventsRepository : IEventsRepository
    {
        private readonly NpgsqlConnection _conn;
        private readonly string insertEventSql = "call events.insert_event(@id, @source, @subject, @type, @cloudevent)";
        private readonly string getEventSql = "select events.get(@_subject, @_after, @_from, @_to, @_type, @_source)";

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsRepository"/> class.
        /// </summary>
        public EventsRepository(IOptions<PostgreSQLSettings> settings, ILogger<EventsRepository> logger)
        {
            _conn = new NpgsqlConnection(string.Format(settings.Value.ConnectionString, settings.Value.EventsDbPwd));
        }

        /// <inheritdoc/>
        public async Task<string> Create(CloudEvent item)
        {
            item.Id = Guid.NewGuid().ToString();
            try
            {
                await _conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(insertEventSql, _conn);
                pgcom.Parameters.AddWithValue("id", item.Id);
                pgcom.Parameters.AddWithValue("source", item.Source.OriginalString);
                pgcom.Parameters.AddWithValue("subject", item.Subject);
                pgcom.Parameters.AddWithValue("type", item.Type);
                pgcom.Parameters.AddWithValue("cloudevent", JsonConvert.SerializeObject(item));

                int res = await pgcom.ExecuteNonQueryAsync();
                return item.Id;
            }
            catch (Exception e)
            {
                Console.WriteLine($" EventsRepository // Create // Exception {JsonConvert.SerializeObject(e)}");
                throw e;
            }
            finally
            {
                await _conn.CloseAsync();
            }
        }

        /// <summary>
        /// rhhr
        /// </summary>
        /// <returns></returns>
        public async Task<List<CloudEvent>> Get(
            string after,
            DateTime? from,
            DateTime? to,
            int partyId,
            List<string> source,
            List<string> type,
            int size = 50)
        {
            List<CloudEvent> searchResult = new List<CloudEvent>();
            int index = 0;

            try
            {
                await _conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getEventSql, _conn);
                pgcom.Parameters.AddWithValue("_subject", NpgsqlDbType.Varchar, partyId == 0 ? string.Empty : $"party/{partyId}");
                pgcom.Parameters.AddWithValue("_after", NpgsqlDbType.Varchar, string.IsNullOrEmpty(after) ? string.Empty : after);
                pgcom.Parameters.AddWithValue("_from", NpgsqlDbType.TimestampTz, (from == null) ? (object)DBNull.Value : from);
                pgcom.Parameters.AddWithValue("_to", NpgsqlDbType.TimestampTz, (to == null) ? (object)DBNull.Value : to);
                pgcom.Parameters.AddWithValue("_source", NpgsqlDbType.Array | NpgsqlDbType.Text, !source.Any() ? (object)DBNull.Value : source);
                pgcom.Parameters.AddWithValue("_type", NpgsqlDbType.Array | NpgsqlDbType.Text, !type.Any() ? (object)DBNull.Value : type);

                using (NpgsqlDataReader reader = pgcom.ExecuteReader())
                {
                    while (reader.Read() & index < size)
                    {
                        CloudEvent cloudEvent = JsonConvert.DeserializeObject<CloudEvent>(reader[0].ToString());
                        searchResult.Add(cloudEvent);
                        ++index;
                    }
                }

                return searchResult;
            }
            catch (Exception e)
            {
                Console.WriteLine($" EventsRepository // Get // Exception {JsonConvert.SerializeObject(e)}");
                throw e;
            }
            finally
            {
                await _conn.CloseAsync();
            }
        }
    }
}
