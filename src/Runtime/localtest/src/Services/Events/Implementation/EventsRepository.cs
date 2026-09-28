#nullable disable

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
        public async Task<CloudEventCreateResult> Create(CloudEvent cloudEvent, Guid? idempotencyKey = null)
        {
            cloudEvent.Id = Guid.NewGuid().ToString();
            cloudEvent.Time = DateTime.UtcNow;

            if (idempotencyKey.HasValue)
            {
                string alreadyRegistered = await TryClaimIdempotencyKey(idempotencyKey.Value, cloudEvent.Id);
                if (alreadyRegistered is not null)
                {
                    return new CloudEventCreateResult(alreadyRegistered, IsDuplicate: true);
                }
            }

            string eventsFolder = GetEventsCollectionFolder();
            Directory.CreateDirectory(eventsFolder);

            string filePath = Path.Combine(eventsFolder, cloudEvent.Id.AsFileName());

            string serializedCloudEvent = JsonConvert.SerializeObject(cloudEvent);
            await File.WriteAllTextAsync(filePath, serializedCloudEvent);

            return new CloudEventCreateResult(cloudEvent.Id, IsDuplicate: false);
        }

        /// <summary>
        /// Records <paramref name="eventId"/> as the event this key registers. Creating the file is the
        /// claim - <see cref="FileMode.CreateNew"/> fails rather than truncates when the file is already
        /// there - so of several requests racing on one key, exactly one may go on to store an event.
        /// </summary>
        /// <returns>The id already registered under this key, or null when this call claimed it.</returns>
        private async Task<string> TryClaimIdempotencyKey(Guid idempotencyKey, string eventId)
        {
            string claimFolder = GetIdempotencyFolder();
            Directory.CreateDirectory(claimFolder);

            string claimPath = Path.Combine(claimFolder, idempotencyKey.ToString().AsFileName());

            try
            {
                using FileStream claim = new(claimPath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
                using StreamWriter writer = new(claim);
                await writer.WriteAsync(eventId);
            }
            catch (IOException) when (File.Exists(claimPath))
            {
                return await ReadClaim(claimPath);
            }

            return null;
        }

        /// <summary>
        /// Reads the id out of a claim someone else won. Taking the claim and writing the id into it are
        /// two steps, so a caller that lost the race can arrive between them and find the file locked or
        /// still empty; both clear as soon as the winner closes it.
        /// </summary>
        private static async Task<string> ReadClaim(string claimPath)
        {
            for (int attempt = 0; attempt < 50; attempt++)
            {
                try
                {
                    string claimed = await File.ReadAllTextAsync(claimPath);
                    if (claimed.Length > 0)
                    {
                        return claimed;
                    }
                }
                catch (IOException)
                {
                    // The winner still holds the file open exclusively.
                }

                await Task.Delay(10);
            }

            throw new IOException($"Timed out reading the idempotency claim at '{claimPath}'.");
        }

        private string GetEventsCollectionFolder()
        {
            return _localPlatformSettings.LocalTestingStorageBasePath +
                   _localPlatformSettings.DocumentDbFolder +
                   _localPlatformSettings.EventsCollectionFolder;
        }

        /// <summary>
        /// The claims live in a folder beside the events rather than among them, so anything listing
        /// stored events is unaffected by them.
        /// </summary>
        private string GetIdempotencyFolder()
        {
            return Path.Combine(GetEventsCollectionFolder(), "idempotency");
        }
    }
}
