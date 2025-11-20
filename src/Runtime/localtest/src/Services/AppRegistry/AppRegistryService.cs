#nullable enable
using System.Collections.Concurrent;
using System.Net;

namespace LocalTest.Services.AppRegistry
{
    /// <summary>
    /// Manages registration of apps running on dynamic ports
    /// </summary>
    public class AppRegistryService
    {
        private readonly ConcurrentDictionary<string, AppRegistration> _registrations = new();
        private readonly ILogger<AppRegistryService> _logger;
        private readonly List<Action> _cacheInvalidationCallbacks = new();

        public AppRegistryService(ILogger<AppRegistryService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Register a callback to be invoked when apps register/unregister
        /// </summary>
        public void RegisterCacheInvalidationCallback(Action callback)
        {
            _cacheInvalidationCallbacks.Add(callback);
        }

        /// <summary>
        /// Register an app with its port number and hostname
        /// </summary>
        /// <param name="appId">Application ID (org/app format)</param>
        /// <param name="port">Port number the app is running on</param>
        /// <param name="hostname">Hostname or IP address</param>
        public void Register(string appId, int port, string hostname)
        {
            var registration = new AppRegistration(appId, port, hostname, DateTime.UtcNow);

            _registrations.AddOrUpdate(
                appId,
                _ => registration,
                (_, _) => registration);

            // Invalidate testData cache since app list changed
            InvalidateTestDataCache();

            _logger.LogInformation("Registered app {AppId} on {Hostname}:{Port}", appId, hostname, port);
        }

        /// <summary>
        /// Get registration for a specific app
        /// </summary>
        private AppRegistration? GetRegistration(string appId)
        {
            return _registrations.TryGetValue(appId, out var registration) ? registration : null;
        }

        /// <summary>
        /// Get the URL for a registered app, properly formatted with IPv4 handling
        /// </summary>
        /// <param name="appId">Application ID (org/app format)</param>
        /// <returns>URL string like "http://172.18.0.6:36813" or null if app not registered</returns>
        public string? GetUrl(string appId)
        {
            var registration = GetRegistration(appId);
            if (registration == null)
            {
                return null;
            }

            var hostname = registration.Hostname;
            if (IPAddress.TryParse(hostname, out var ipAddress))
            {
                if (ipAddress.IsIPv4MappedToIPv6)
                {
                    hostname = ipAddress.MapToIPv4().ToString();
                }
                else if (ipAddress.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6)
                {
                    hostname = $"[{hostname}]";
                }
            }

            return $"http://{hostname}:{registration.Port}";
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
                // Invalidate testData cache since app list changed
                InvalidateTestDataCache();
                _logger.LogInformation("Unregistered app {AppId}", appId);
            }
            return removed;
        }

        /// <summary>
        /// Invalidates cached testData to force re-fetching from apps
        /// </summary>
        private void InvalidateTestDataCache()
        {
            foreach (var callback in _cacheInvalidationCallbacks)
            {
                callback();
            }
        }
    }

    /// <summary>
    /// Represents a registered app
    /// </summary>
    public record AppRegistration(string AppId, int Port, string Hostname, DateTime RegisteredAt);
}
