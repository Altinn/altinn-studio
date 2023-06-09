using System;
using System.Collections.Concurrent;
using System.Threading;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <inheritdoc cref="IUserRequestsSynchronizationService"/>
    public class UserRequestsSynchronizationService : IUserRequestsSynchronizationService, IDisposable
    {
        private static readonly ConcurrentDictionary<string, SemaphoreSlim> s_semaphoreSlims = new ConcurrentDictionary<string, SemaphoreSlim>();
        private static readonly ConcurrentDictionary<string, DateTime> s_lastUsedTimes = new ConcurrentDictionary<string, DateTime>();
        private readonly UserRequestSynchronizationSettings _userParallelizationSettings;

        private readonly Timer _timer;

        public UserRequestsSynchronizationService(UserRequestSynchronizationSettings userParallelizationSettings)
        {
            _userParallelizationSettings = userParallelizationSettings;
            _timer = new Timer(_ => CleanupUnusedKeys(), null, TimeSpan.FromSeconds(_userParallelizationSettings.CleanUpFrequencyInSeconds), TimeSpan.FromSeconds(_userParallelizationSettings.CleanUpFrequencyInSeconds));
        }

        public SemaphoreSlim GetRequestsSemaphore(string org, string repo, string developer)
        {
            Guard.AssertArgumentNotNull(org, nameof(org));
            Guard.AssertArgumentNotNull(repo, nameof(repo));
            Guard.AssertArgumentNotNull(developer, nameof(developer));

            string key = GenerateKey(org, repo, developer);
            s_lastUsedTimes.AddOrUpdate(key, DateTime.Now, (k, v) => DateTime.Now);
            return s_semaphoreSlims.GetOrAdd(key, _ => new SemaphoreSlim(_userParallelizationSettings.MaxDegreeOfParallelism, _userParallelizationSettings.MaxDegreeOfParallelism));
        }

        private static string GenerateKey(string org, string repo, string developer)
            => $"{org}_{repo}_{developer}".ToLower();

        private void CleanupUnusedKeys()
        {
            DateTime now = DateTime.Now;

            foreach ((string key, DateTime lastUsed) in s_lastUsedTimes)
            {
                if (now.Subtract(lastUsed).TotalSeconds >= _userParallelizationSettings.SemaphoreExpiryInSeconds)
                {
                    s_lastUsedTimes.TryRemove(key, out DateTime _);
                    s_semaphoreSlims.TryRemove(key, out SemaphoreSlim semaphoreSlim);
                    semaphoreSlim?.Dispose();
                }
            }
        }

        public void Dispose() => _timer?.Dispose();
    }
}
