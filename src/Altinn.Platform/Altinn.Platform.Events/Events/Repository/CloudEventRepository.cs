using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Models;

using Microsoft.Extensions.Options;

using Npgsql;

using NpgsqlTypes;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Handles events repository.
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class CloudEventRepository : ICloudEventRepository
    {
        private readonly string insertEventSql = "select events.insertevent(@id, @source, @subject, @type, @cloudevent)";
        private readonly string getEventSql = "select events.get(@_subject, @_after, @_from, @_to, @_type, @_source)";
        private readonly string _connectionString;

        /// <summary>
        /// Initializes a new instance of the <see cref="CloudEventRepository"/> class.
        /// </summary>
        public CloudEventRepository(IOptions<PostgreSQLSettings> postgresSettings)
        {
            _connectionString = string.Format(
                postgresSettings.Value.ConnectionString,
                postgresSettings.Value.EventsDbPwd);
        }

        /// <inheritdoc/>
        public async Task<CloudEvent> Create(CloudEvent cloudEvent)
        {
            using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            using NpgsqlCommand pgcom = new NpgsqlCommand(insertEventSql, conn);
            pgcom.Parameters.AddWithValue("id", cloudEvent.Id);
            pgcom.Parameters.AddWithValue("source", cloudEvent.Source.OriginalString);
            pgcom.Parameters.AddWithValue("subject", cloudEvent.Subject);
            pgcom.Parameters.AddWithValue("type", cloudEvent.Type);
            pgcom.Parameters.Add(new NpgsqlParameter("cloudevent", cloudEvent.Serialize()) { Direction = System.Data.ParameterDirection.InputOutput });

            pgcom.ExecuteNonQuery();
            string output = (string)pgcom.Parameters[4].Value;
            cloudEvent = DeserializeAndConvertTime(output);

            return cloudEvent;
        }

        /// <inheritdoc/>
        public async Task<List<CloudEvent>> Get(string after, DateTime? from, DateTime? to, string subject, List<string> source, List<string> type, int size)
        {
            List<CloudEvent> searchResult = new List<CloudEvent>();
            int index = 0;

            using NpgsqlConnection conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            NpgsqlCommand pgcom = new NpgsqlCommand(getEventSql, conn);
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
                    CloudEvent cloudEvent = DeserializeAndConvertTime(reader[0].ToString());
                    searchResult.Add(cloudEvent);
                    ++index;
                }
            }

            return searchResult;
        }

        private static CloudEvent DeserializeAndConvertTime(string eventString)
        {
            CloudEvent cloudEvent = CloudEvent.Deserialize(eventString);
            cloudEvent.Time = cloudEvent.Time.Value.ToUniversalTime();

            return cloudEvent;
        }
    }
}
