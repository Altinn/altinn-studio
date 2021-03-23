using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository.Interfaces;
using Altinn.Platform.Events.Tests.Models;
using Newtonsoft.Json;

namespace Altinn.Platform.Events.Tests.Mocks
{
    /// <summary>
    /// Class that mocks storing and retrieving documents from postgres DB.
    /// </summary>
    public class PostgresRepositoryMock : IPostgresRepository
    {
        private readonly int _eventsCollection;

        public PostgresRepositoryMock(int eventsCollection = 1)
        {
            _eventsCollection = eventsCollection;
        }

        /// <inheritdoc/>
        public Task<string> Create(CloudEvent cloudEvent)
        {
            return Task.FromResult(cloudEvent.Id);
        }

        public Task<int> CreateSubscription(Subscription eventsSubscription)
        {
            Random rnd = new Random();
            eventsSubscription.Id = rnd.Next(1, int.MaxValue);
            return Task.FromResult(eventsSubscription.Id);
        }

        public Task DeleteSubscription(int id)
        {
            return Task.CompletedTask;
        }

        /// <inheritdoc/>
        public Task<List<CloudEvent>> Get(string after, DateTime? from, DateTime? to, string subject, List<string> source, List<string> type, int size)
        {
            string eventsPath = Path.Combine(GetEventsPath(), $@"{_eventsCollection}.json");

            if (File.Exists(eventsPath))
            {
                string content = File.ReadAllText(eventsPath);
                List<EventsTableEntry> tableEntries = JsonConvert.DeserializeObject<List<EventsTableEntry>>(content);

                // logic for filtering on source and type not implemented.
                IEnumerable<EventsTableEntry> filter = tableEntries;

                if (!string.IsNullOrEmpty(after))
                {
                    int sequenceNo = filter.Where(te => te.Id.Equals(after)).Select(te => te.SequenceNo).FirstOrDefault();
                    filter = filter.Where(te => te.SequenceNo > sequenceNo);
                }

                if (from.HasValue)
                {
                    filter = filter.Where(te => te.Time >= from);
                }

                if (to.HasValue)
                {
                    filter = filter.Where(te => te.Time <= to);
                }

                if (!string.IsNullOrEmpty(subject))
                {
                    filter = filter.Where(te => te.Subject.Equals(subject));
                }

                if (source != null && source.Count > 0)
                {
                    // requires more logic to match all fancy cases.
                    filter = filter.Where(te => source.Contains(te.Source.ToString()));
                }

                if (type != null && type.Count > 0)
                {
                    // requires more logic to match all fancy cases.
                    filter = filter.Where(te => type.Contains(te.Type.ToString()));
                }

                List<CloudEvent> result = filter.Select(t => t.CloudEvent)
                    .Take(size)
                    .ToList();

                result.ForEach(ce => ce.Time = ce.Time.Value.ToUniversalTime());
                return Task.FromResult(result);
            }

            return null;
        }

        public Task<Subscription> GetSubscription(int id)
        {
            return Task.FromResult(new Subscription() { Id = id, AlternativeSubjectFilter = "/organisation/950474084", CreatedBy = "/organisation/950474084" });
        }

        public Task<List<Subscription>> GetSubscriptionsByConsumer(string consumer)
        {
            string subscriptionsPath = Path.Combine(GetSubscriptionPath(), "1.json");
            List<Subscription> subscriptions = null;
            if (File.Exists(subscriptionsPath))
            {
                string content = File.ReadAllText(subscriptionsPath);
                subscriptions = JsonConvert.DeserializeObject<List<Subscription>>(content);
            }
            else
            {
                subscriptions = new List<Subscription>();
            }

            return Task.FromResult(subscriptions.Where(s => s.Consumer.StartsWith("/org/")).ToList());
        }

        public Task<List<Subscription>> GetSubscriptionsExcludeOrg(string source, string subject, string type)
        {
            string subscriptionsPath = Path.Combine(GetSubscriptionPath(), "1.json");
            List<Subscription> subscriptions = null;
            if (File.Exists(subscriptionsPath))
            {
                string content = File.ReadAllText(subscriptionsPath);
                subscriptions = JsonConvert.DeserializeObject<List<Subscription>>(content);
            }
            else
            {
                subscriptions = new List<Subscription>();
            }

            return Task.FromResult(subscriptions.Where(s => 
                                !s.Consumer.StartsWith("/org/") &&
                                s.SourceFilter.Equals(source) &&
                                subject.Equals(subject) &&
                                (string.IsNullOrEmpty(s.TypeFilter) || type.Equals(s.TypeFilter))).ToList() );
        }

        private string GetEventsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(EventsServiceMock).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\events");
        }

        private string GetSubscriptionPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(EventsServiceMock).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\subscriptions");
        }
    }
}
