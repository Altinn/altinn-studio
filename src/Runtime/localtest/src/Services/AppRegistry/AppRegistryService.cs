#nullable enable
using System.Collections.Concurrent;
using LocalTest.Services.TestData;

namespace LocalTest.Services.AppRegistry
{
    /// <summary>
    /// Manages registration of apps running on dynamic ports
    /// </summary>
    public class AppRegistryService
    {
        private readonly ConcurrentDictionary<string, AppRegistration> _registrations = new();
        private readonly ILogger<AppRegistryService> _logger;
        private TestDataModel? _mergedTestData;
        private readonly object _mergeLock = new();
        private readonly Microsoft.Extensions.Caching.Memory.IMemoryCache _cache;

        public AppRegistryService(ILogger<AppRegistryService> logger, Microsoft.Extensions.Caching.Memory.IMemoryCache cache)
        {
            _logger = logger;
            _cache = cache;
        }

        /// <summary>
        /// Register an app with its port number, hostname, and optional test data
        /// </summary>
        /// <param name="appId">Application ID (org/app format)</param>
        /// <param name="port">Port number the app is running on</param>
        /// <param name="hostname">Hostname or IP address (defaults to host.docker.internal)</param>
        /// <param name="testData">Optional test data for this app</param>
        public void Register(string appId, int port, string? hostname = null, AppTestDataModel? testData = null)
        {
            hostname ??= "host.docker.internal";
            var registration = new AppRegistration(appId, port, hostname, DateTime.UtcNow, testData);
            AppRegistration? previous = null;
            var replacedExisting = false;

            _registrations.AddOrUpdate(
                appId,
                _ => registration,
                (_, existing) =>
                {
                    previous = existing;
                    replacedExisting = true;
                    return registration;
                });

            try
            {
                if (testData != null || previous?.TestData != null)
                {
                    RebuildMergedTestData();
                    InvalidateTestDataCache();
                }

                _logger.LogInformation("Registered app {AppId} on {Hostname}:{Port}", appId, hostname, port);
            }
            catch
            {
                if (replacedExisting && previous != null)
                {
                    _registrations[appId] = previous;
                }
                else
                {
                    _registrations.TryRemove(appId, out _);
                }

                if (previous?.TestData != null)
                {
                    RebuildMergedTestData();
                    InvalidateTestDataCache();
                }

                throw;
            }
        }

        /// <summary>
        /// Get registration for a specific app
        /// </summary>
        public AppRegistration? GetRegistration(string appId)
        {
            return _registrations.TryGetValue(appId, out var registration) ? registration : null;
        }

        /// <summary>
        /// Get all registered apps
        /// </summary>
        public Dictionary<string, AppRegistration> GetAll()
        {
            return new Dictionary<string, AppRegistration>(_registrations);
        }

        /// <summary>
        /// Unregister an app
        /// </summary>
        public bool Unregister(string appId)
        {
            var removed = _registrations.TryRemove(appId, out _);
            if (removed)
            {
                _logger.LogInformation("Unregistered app {AppId}", appId);
                RebuildMergedTestData();
                InvalidateTestDataCache();
            }
            return removed;
        }

        /// <summary>
        /// Get merged test data from all registered apps
        /// </summary>
        public TestDataModel? GetMergedTestData()
        {
            return _mergedTestData;
        }

        private void RebuildMergedTestData()
        {
            lock (_mergeLock)
            {
                var merged = new TestDataModel();

                foreach (var registration in _registrations.Values)
                {
                    if (registration.TestData == null)
                        continue;

                    var appModel = registration.TestData.GetTestDataModel();

                    // Check for user ID conflicts before merging
                    if (appModel.Profile?.User != null)
                    {
                        foreach (var (userId, user) in appModel.Profile.User)
                        {
                            if (merged.Profile.User.TryGetValue(userId, out var existingUser))
                            {
                                // User with same ID already exists - check if they match
                                if (!UsersMatch(existingUser, user))
                                {
                                    throw new InvalidOperationException(
                                        $"Cannot register app {registration.AppId}: User ID {userId} already registered by another app with different data. " +
                                        $"Existing user: {existingUser.UserName}, New user: {user.UserName}"
                                    );
                                }
                            }
                        }
                    }

                    // Use shared merge logic
                    TestDataMerger.MergeTestData(appModel, merged);
                }

                _mergedTestData = merged.Profile.User.Count > 0 ? merged : null;

                if (_mergedTestData != null)
                {
                    _logger.LogInformation(
                        "Merged test data from {AppCount} apps: {UserCount} users, {OrgCount} orgs",
                        _registrations.Count,
                        _mergedTestData.Profile.User.Count,
                        _mergedTestData.Register.Org.Count
                    );
                }
            }
        }

        private static bool UsersMatch(Altinn.Platform.Profile.Models.UserProfile user1, Altinn.Platform.Profile.Models.UserProfile user2)
        {
            return user1.UserId == user2.UserId &&
                   user1.UserName == user2.UserName &&
                   user1.PartyId == user2.PartyId;
        }

        private void InvalidateTestDataCache()
        {
            _cache.Remove("TEST_DATA");
            foreach (var appId in _registrations.Keys)
            {
                _cache.Remove("TEST_DATA_" + appId);
            }
        }
    }

    /// <summary>
    /// Represents a registered app
    /// </summary>
    public record AppRegistration(string AppId, int Port, string Hostname, DateTime RegisteredAt, AppTestDataModel? TestData = null);
}
