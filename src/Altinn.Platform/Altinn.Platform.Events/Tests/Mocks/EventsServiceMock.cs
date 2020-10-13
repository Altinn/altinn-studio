using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using Altinn.Platform.Events.Tests.Models;

namespace Altinn.Platform.Events.Tests.Mocks
{
    public class EventsServiceMock : IEventsService
    {
        private int _eventsCollection;

        public EventsServiceMock(int eventsCollection)
        {
            _eventsCollection = eventsCollection;
        }

        public Task<List<CloudEvent>> Get(string after, DateTime? from, DateTime? to, int partyId, List<string> source, List<string> type, int size)
        {
            string eventsPath = Path.Combine(GetEventsPath(), $@"{_eventsCollection}.json");

            if (File.Exists(eventsPath))
            {
                string content = File.ReadAllText(eventsPath);
                List<EventsTableEntry> tableEntries = JsonSerializer.Deserialize<List<EventsTableEntry>>(content);

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


                if (partyId > 0)
                {
                    string subject = $"party/{partyId}";
                    filter = filter.Where(te => te.Subject.Equals(subject));
                }

                List<CloudEvent> result = filter.Select(t => t.CloudEvent)
                    .Take(size)
                    .ToList();

                return Task.FromResult(result);
            }

            return null;
        }

        public Task<string> StoreCloudEvent(CloudEvent cloudEvent)
        {
            throw new NotImplementedException();
        }

        private string GetEventsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(EventsServiceMock).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\events");
        }
    }
}
