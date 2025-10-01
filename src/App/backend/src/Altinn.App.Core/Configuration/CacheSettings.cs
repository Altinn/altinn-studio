namespace Altinn.App.Core.Configuration;

/// <summary>
/// Represents caching settings used by the platform services
/// </summary>
public class CacheSettings
{
    /// <summary>
    /// The number of seconds the user profile will be kept in the cache
    /// </summary>
    public int ProfileCacheLifetimeSeconds { get; set; } = 540;
}
