using System;
using System.Threading;
using Microsoft.IdentityModel.Logging;

namespace AltinnCore.Designer.Infrastructure.Authentication
{
    /// <summary>
    /// Manages the access token that is needed to communicate with Platform services
    /// </summary>
    public class PlatformTokenManager
    {
        public static readonly TimeSpan DefaultRefreshInterval = new TimeSpan(0, 0, 0, 30);
        public static readonly TimeSpan MinimumRefreshInterval = new TimeSpan(0, 0, 0, 1);
        private TimeSpan _refreshInterval = DefaultRefreshInterval;
        private DateTimeOffset _syncAfter = DateTimeOffset.MinValue;
        private DateTimeOffset _lastRefresh = DateTimeOffset.MinValue;

        private readonly SemaphoreSlim _refreshLock;
        private string CurrentToken;

        public PlatformTokenManager()
        {
            _refreshLock = new SemaphoreSlim(1);
        }

        /// <summary>
        /// The minimum time between retrievals, in the event that a retrieval failed, or that a refresh was explicitly requested.
        /// </summary>
        public TimeSpan RefreshInterval
        {
            get => _refreshInterval;
            set
            {
                if (value < MinimumRefreshInterval)
                {

                }

                _refreshInterval = value;
            }
        }
    }
}
