using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.Profile;
using Altinn.Platform.Profile.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Profile;

/// <summary>.
/// Decorates an implementation of IProfileClient by caching the party object.
/// If available, object is retrieved from cache without calling the service
/// </summary>
public class ProfileClientCachingDecorator : IProfileClient
{
    private readonly IProfileClient _decoratedService;
    private readonly IMemoryCache _memoryCache;
    private readonly MemoryCacheEntryOptions _cacheOptions;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProfileClientCachingDecorator"/> class.
    /// </summary>
    public ProfileClientCachingDecorator(
        IProfileClient decoratedService,
        IMemoryCache memoryCache,
        IOptions<CacheSettings> settings
    )
    {
        _decoratedService = decoratedService;
        _memoryCache = memoryCache;

        _cacheOptions = new()
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(settings.Value.ProfileCacheLifetimeSeconds),
        };
    }

    /// <inheritdoc/>
    public async Task<UserProfile?> GetUserProfile(int userId)
    {
        string uniqueCacheKey = "User_UserId_" + userId;

        if (_memoryCache.TryGetValue(uniqueCacheKey, out UserProfile? user))
        {
            return user;
        }

        user = await _decoratedService.GetUserProfile(userId);

        if (user != null)
        {
            _memoryCache.Set(uniqueCacheKey, user, _cacheOptions);
        }

        return user;
    }

    /// <inheritdoc/>
    public async Task<UserProfile?> GetUserProfile(string ssn)
    {
        string uniqueCacheKey = "User_SSN_" + ssn;

        if (_memoryCache.TryGetValue(uniqueCacheKey, out UserProfile? user))
        {
            return user;
        }

        user = await _decoratedService.GetUserProfile(ssn);

        if (user != null)
        {
            _memoryCache.Set(uniqueCacheKey, user, _cacheOptions);
        }

        return user;
    }
}
