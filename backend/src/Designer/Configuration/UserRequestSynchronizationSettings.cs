using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Settings that provide configuration for the user request synchronization service.
    /// </summary>
    public class UserRequestSynchronizationSettings : ISettingsMarker
    {
        /// <summary>
        /// Describes the number of minutes a semaphore will be kept before it is removed. Expiry is renewed each time the semaphore is used.
        /// </summary>
        public int SemaphoreExpiryInSeconds { get; set; } = 2 * 60 * 60;
        /// <summary>
        /// Describes how frequently the service will clean up unused semaphores.
        /// </summary>
        public int CleanUpFrequencyInSeconds { get; set; } = 2 * 60 * 60;
        /// <summary>
        /// Defines the maximum number of parallel requests per user.
        /// </summary>
        public int MaxDegreeOfParallelism { get; set; } = 1;
    }
}
