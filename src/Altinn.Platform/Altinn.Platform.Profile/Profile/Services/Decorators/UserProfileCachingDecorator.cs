using System;
using System.Threading.Tasks;

using Altinn.Platform.Profile.Configuration;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Profile.Services.Interfaces;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Profile.Services.Decorators
{
    /// <summary>.
    /// Decorates an implementation of IUserProfiles by caching the userProfile object.
    /// If available, object is retrieved from cache without calling the service
    /// </summary>
    public class UserProfileCachingDecorator : IUserProfiles
    {
        private readonly IUserProfiles _decoratedService;
        private readonly IMemoryCache _memoryCache;
        private readonly MemoryCacheEntryOptions _cacheOptions;

        /// <summary>
        /// Initializes a new instance of the <see cref="UserProfileCachingDecorator"/> class.
        /// </summary>
        /// <param name="decoratedService">The decorated userProfiles service</param>
        /// <param name="memoryCache">The memory cache</param>
        /// <param name="generalSettings">The general settings</param>
        public UserProfileCachingDecorator(
            IUserProfiles decoratedService,
            IMemoryCache memoryCache,
            IOptions<GeneralSettings> generalSettings)
        {
            _decoratedService = decoratedService;
            _memoryCache = memoryCache;
            _cacheOptions = new()
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(generalSettings.Value.ProfileCacheLifetimeSeconds)
            };
        }

        /// <inheritdoc/>
        public async Task<UserProfile> GetUser(int userId)
        {
            string uniqueCacheKey = "User_UserId_" + userId;

            if (_memoryCache.TryGetValue(uniqueCacheKey, out UserProfile user))
            {
                return user;
            }

            user = await _decoratedService.GetUser(userId);

            if (user != null)
            {
                _memoryCache.Set(uniqueCacheKey, user, _cacheOptions);
            }

            return user;
        }

        /// <inheritdoc/>
        public async Task<UserProfile> GetUser(string ssn)
        {
            string uniqueCacheKey = "User_SSN_" + ssn;

            if (_memoryCache.TryGetValue(uniqueCacheKey, out UserProfile user))
            {
                return user;
            }

            user = await _decoratedService.GetUser(ssn); 

            if (user != null)
            {
                _memoryCache.Set(uniqueCacheKey, user, _cacheOptions);
            }

            return user;
        }
    }
}
