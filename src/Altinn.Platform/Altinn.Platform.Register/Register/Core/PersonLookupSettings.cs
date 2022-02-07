namespace Altinn.Platform.Register.Core
{
    /// <summary>
    /// Represents settings related to the person lookup endpoint.
    /// </summary>
    public class PersonLookupSettings
    {
        /// <summary>
        /// The maximum number of times a user can fail to enter correct match.
        /// </summary>
        public int MaximumFailedAttempts { get; set; } = 1;

        /// <summary>
        /// The number of seconds the failed attempts counter will be kept in the cache.
        /// </summary>
        public int FailedAttemptsCacheLifetimeSeconds { get; set; } = 3600;
    }
}
