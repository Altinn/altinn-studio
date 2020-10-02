using System;
using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Events.Repository;
using Altinn.Platform.Events.Models;

using LocalTest.Configuration;
using LocalTest.Helpers;
using Microsoft.Extensions.Options;

using Newtonsoft.Json;

namespace LocalTest.Services.Events.Implementation
{
    /// <summary>
    /// Represents an implementation of <see cref="IEventsRepository"/> that will
    /// read and write events to the file system.
    /// </summary>
    public class EventsRepository : IEventsRepository
    {
        private readonly LocalPlatformSettings _localPlatformSettings;

        /// <summary>
        /// Initialize a new instance of the <see cref="EventsRepository"/> class with the given settings.
        /// </summary>
        /// <param name="localPlatformSettings"></param>
        public EventsRepository(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        /// <inheritdoc />
        public async Task<string> Create(CloudEvent cloudEvent)
        {
            cloudEvent.Id = Guid.NewGuid().ToString();
            cloudEvent.Time = DateTime.UtcNow;

            string eventsFolder = GetEventsCollectionFolder();
            Directory.CreateDirectory(eventsFolder);

            string filePath = Path.Combine(eventsFolder, cloudEvent.Id.AsFileName());

            string serializedCloudEvent = JsonConvert.SerializeObject(cloudEvent);
            await File.WriteAllTextAsync(filePath, serializedCloudEvent);

            return cloudEvent.Id;
        }

        private string GetEventsCollectionFolder()
        {
            return _localPlatformSettings.LocalTestingStorageBasePath +
                   _localPlatformSettings.DocumentDbFolder +
                   _localPlatformSettings.EventsCollectionFolder;
        }
    }
}
