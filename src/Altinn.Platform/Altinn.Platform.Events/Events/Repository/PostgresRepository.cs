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
        private readonly string insertSubscriptionSql = "call events.insert_subcsription(@sourcefilter, @subjectfilter, @typefilter, @consumer, @endpointurl, @createdby, @validated, @subscription_id)";
        private readonly string getSubscriptionSql = "select * from events.getsubscription(@_id)";
        private readonly string deleteSubscription = "call events.deletesubscription(@_id)";
        private readonly string getSubscriptionsExcludeOrgsSql = "select * from events.getsubscriptionsexcludeorgs(@source, @subject, @type)";
        private readonly string getSubscriptionByConsumerSql = "select * from events.getsubscriptionsbyconsumer(@_consumer)";

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
        public async Task<int> CreateSubscription(Subscription eventsSubscription)
        {
            try
            {
                await _conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(insertSubscriptionSql, _conn);
                pgcom.Parameters.AddWithValue("sourcefilter", eventsSubscription.SourceFilter.AbsoluteUri);

                if (eventsSubscription.SubjectFilter != null)
                {
                    pgcom.Parameters.AddWithValue("subjectfilter", eventsSubscription.SubjectFilter);
                }
                else
                {
                    pgcom.Parameters.AddWithValue("subjectfilter", DBNull.Value);
                }

                if (eventsSubscription.TypeFilter != null)
                {
                    pgcom.Parameters.AddWithValue("typefilter", eventsSubscription.TypeFilter);
                }
                else
                {
                    pgcom.Parameters.AddWithValue("typefilter", DBNull.Value);
                }

                int subscriptionid = 0; // To be able to get value out
                pgcom.Parameters.AddWithValue("consumer", eventsSubscription.Consumer);
                pgcom.Parameters.AddWithValue("endpointurl", eventsSubscription.EndPoint.AbsoluteUri);
                pgcom.Parameters.AddWithValue("createdby", eventsSubscription.CreatedBy);
                pgcom.Parameters.AddWithValue("validated", false);
                pgcom.Parameters.AddWithValue("subscription_id", subscriptionid);

                using (NpgsqlDataReader reader = pgcom.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        eventsSubscription.Id = int.Parse(reader["subscription_id"].ToString());
                    }
                }

                return eventsSubscription.Id;
            }
            catch (Exception e)
            {
                _logger.LogError("PostgresRepository // CreateSubscription // Exception", e);
                throw;
            }
            finally
            {
                await _conn.CloseAsync();
            }
        }

        /// <inheritdoc/>
        public async Task DeleteSubscription(int id)
        {
            try
            {
                await _conn.OpenAsync();
                NpgsqlCommand pgcom = new NpgsqlCommand(deleteSubscription, _conn);
                pgcom.Parameters.AddWithValue("_id", id);

                await pgcom.ExecuteNonQueryAsync();
            }
            catch (Exception e)
            {
                _logger.LogError("PostgresRepository // DeleteSubscription // Exception", e);
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

        /// <inheritdoc/>
        public async Task<Subscription> GetSubscription(int id)
        {
            Subscription subscription = null;
            try
            {
                await _conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getSubscriptionSql, _conn);
                pgcom.Parameters.AddWithValue("_id", NpgsqlDbType.Integer, id);

                using (NpgsqlDataReader reader = pgcom.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        subscription = GetSubscription(reader);
                    }
                }

                return subscription;
            }
            catch (Exception e)
            {
                Console.WriteLine($" PostgresRepository // GetSubscription // Exception {JsonSerializer.Serialize(e)}");
                throw;
            }
            finally
            {
                await _conn.CloseAsync();
            }
        }

        /// <inheritdoc/>
        public async Task<List<Subscription>> GetSubscriptionsExcludeOrg(string source, string subject, string type)
        {
            List<Subscription> searchResult = new List<Subscription>();
            try
            {
                await _conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getSubscriptionsExcludeOrgsSql, _conn);
                pgcom.Parameters.AddWithValue("source", NpgsqlDbType.Varchar, source);
                pgcom.Parameters.AddWithValue("subject", NpgsqlDbType.Varchar, subject);
                pgcom.Parameters.AddWithValue("type", NpgsqlDbType.Varchar, type);

                using (NpgsqlDataReader reader = pgcom.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        searchResult.Add(GetSubscription(reader));
                    }
                }

                return searchResult;
            }
            catch (Exception e)
            {
                _logger.LogError("PostgresRepository // GetSubscriptionsExcludeOrg // Exception", e);
                throw;
            }
            finally
            {
                await _conn.CloseAsync();
            }
        }

        /// <inheritdoc/>
        public async Task<List<Subscription>> GetSubscriptionsByConsumer(string consumer)
        {
            List<Subscription> searchResult = new List<Subscription>();
            try
            {
                await _conn.OpenAsync();

                NpgsqlCommand pgcom = new NpgsqlCommand(getSubscriptionByConsumerSql, _conn);
                pgcom.Parameters.AddWithValue("_consumer", NpgsqlDbType.Varchar, consumer);

                using (NpgsqlDataReader reader = pgcom.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        searchResult.Add(GetSubscription(reader));
                    }
                }

                return searchResult;
            }
            catch (Exception e)
            {
                _logger.LogError("PostgresRepository // GetSubscriptionByConsumer // Exception", e);
                throw;
            }
            finally
            {
                await _conn.CloseAsync();
            }
        }

        private static Subscription GetSubscription(NpgsqlDataReader reader)
        {
            Subscription subscription = new Subscription();
            subscription.Id = Convert.ToInt32(reader["id"].ToString());
            subscription.SourceFilter = new Uri(reader["sourcefilter"].ToString());
            subscription.SubjectFilter = reader["subjectfilter"].ToString();
            subscription.TypeFilter = reader["typefilter"].ToString();
            subscription.Consumer = reader["consumer"].ToString();
            subscription.EndPoint = new Uri(reader["endpointurl"].ToString());
            subscription.CreatedBy = reader["createdby"].ToString();
            subscription.Created = DateTime.Parse(reader["time"].ToString());
            return subscription;
        }
    }
}
