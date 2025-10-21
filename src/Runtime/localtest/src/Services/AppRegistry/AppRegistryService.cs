#nullable enable
using System.Collections.Concurrent;

namespace LocalTest.Services.AppRegistry
{
    /// <summary>
    /// Manages registration of apps running on dynamic ports
    /// </summary>
    public class AppRegistryService
    {
        private readonly ConcurrentDictionary<string, AppRegistration> _registrations = new();
        private readonly ILogger<AppRegistryService> _logger;

        public AppRegistryService(ILogger<AppRegistryService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Register an app with its port number and hostname
        /// </summary>
        /// <param name="appId">Application ID (org/app format)</param>
        /// <param name="port">Port number the app is running on</param>
        /// <param name="hostname">Hostname or IP address (defaults to host.docker.internal)</param>
        public void Register(string appId, int port, string? hostname = null)
        {
            hostname ??= "host.docker.internal";
            var registration = new AppRegistration(appId, port, hostname, DateTime.UtcNow);
            _registrations.AddOrUpdate(appId, registration, (_, _) => registration);
            _logger.LogInformation("Registered app {AppId} on {Hostname}:{Port}", appId, hostname, port);
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
            }
            return removed;
        }
    }

    /// <summary>
    /// Represents a registered app
    /// </summary>
    public record AppRegistration(string AppId, int Port, string Hostname, DateTime RegisteredAt);
}
