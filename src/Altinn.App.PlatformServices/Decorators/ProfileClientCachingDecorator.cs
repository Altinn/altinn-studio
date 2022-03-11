﻿using System;
using System.Threading.Tasks;

using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Altinn.Platform.Profile.Models;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Altinn.App.Services.Decorators
{
    /// <summary>.
    /// Decorates an implementation of IProfile by caching the party object.
    /// If available, object is retrieved from cache without calling the service
    /// </summary>
    public class ProfileClientCachingDecorator : IProfile
    {
        private readonly IProfile _decoratedService;
        private readonly IMemoryCache _memoryCache;
        private readonly MemoryCacheEntryOptions _cacheOptions;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileClientCachingDecorator"/> class.
        /// </summary>
        public ProfileClientCachingDecorator(IProfile decoratedService, IMemoryCache memoryCache, IOptions<CacheSettings> _settings)
        {
            _decoratedService = decoratedService;
            _memoryCache = memoryCache;

            _cacheOptions = new()
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(_settings.Value.ProfileCacheLifetimeSeconds)
            };
        }

        /// <inheritdoc/>
        public async Task<UserProfile> GetUserProfile(int userId)
        {
            string uniqueCacheKey = "User_UserId_" + userId;

            if (_memoryCache.TryGetValue(uniqueCacheKey, out UserProfile user))
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
    }
}
