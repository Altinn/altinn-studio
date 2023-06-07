using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class UserRequestsSynchronizationService : IUserRequestsSynchronizationService, IDisposable
    {
        private static readonly ConcurrentDictionary<string, SemaphoreSlim> s_semaphoreSlims = new ConcurrentDictionary<string, SemaphoreSlim>();
        private static readonly ConcurrentDictionary<string, DateTime> s_lastUsedTimes = new ConcurrentDictionary<string, DateTime>();

        private Timer _timer;

        public UserRequestsSynchronizationService()
        {
            _timer = new Timer((e) => CleanupUnusedKeys(), null, TimeSpan.FromHours(2), TimeSpan.FromHours(2));
        }

        public SemaphoreSlim GetUserRepoSemaphore(string org, string repo, string developer)
        {
            Guard.AssertArgumentNotNull(org, nameof(org));
            Guard.AssertArgumentNotNull(repo, nameof(repo));
            Guard.AssertArgumentNotNull(developer, nameof(developer));

            string key = GenerateKey(org, repo, developer);
            s_lastUsedTimes.AddOrUpdate(key, DateTime.Now, (k, v) => DateTime.Now);
            return s_semaphoreSlims.GetOrAdd(key, new SemaphoreSlim(1));
        }

        private static string GenerateKey(string org, string repo, string developer)
            => $"{org}_{repo}_{developer}".Remove(' ');

        public static void CleanupUnusedKeys()
        {
            DateTime now = DateTime.Now;
            foreach (KeyValuePair<string, DateTime> kvp in s_lastUsedTimes)
            {
                if (now.Subtract(kvp.Value).TotalHours >= 2)
                {
                    s_lastUsedTimes.TryRemove(kvp.Key, out DateTime _);
                    s_semaphoreSlims.TryRemove(kvp.Key, out SemaphoreSlim _);
                }
            }
        }

        public void Dispose()
        {
            _timer?.Dispose();
        }

        public SemaphoreSlim GetRequestsSemaphore(string org, string repo, string developer) => throw new NotImplementedException();
    }
}
