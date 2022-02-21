#nullable enable

using System;
using System.Threading.Tasks;
using Altinn.Platform.Register.Core;
using Altinn.Platform.Register.Models;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Register.Services
{
    /// <summary>
    /// Represents the business logic related to checking if a national identity number is in use.
    /// </summary>
    public class PersonLookupCacheDecorator : IPersonLookup
    {
        private readonly IPersonLookup _decoratedService;
        private readonly IMemoryCache _memoryCache;
        private readonly MemoryCacheEntryOptions _memoryCacheOptions;

        /// <summary>
        /// Initialize a new instance of the <see cref="PersonLookupService"/> class.
        /// </summary>
        public PersonLookupCacheDecorator(
            IPersonLookup decoratedService,
            IMemoryCache memoryCache,
            IOptions<PersonLookupSettings> personLookupSettings)
        {
            _decoratedService = decoratedService;
            _memoryCache = memoryCache;

            _memoryCacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow =
                    TimeSpan.FromSeconds(personLookupSettings.Value.PersonCacheLifetimeSeconds)
            };
        }

        /// <summary>
        /// Operation for checking if a given national identity number is connected to a person.
        /// </summary>
        /// <param name="nationalIdentityNumber">The national identity number to check.</param>
        /// <param name="lastName">The last name of the person. Must match the last name of the person.</param>
        /// <param name="activeUser">The unique id of the user performing the check.</param>
        /// <returns>The identified <see cref="Task{Party}"/> if last name was correct.</returns>
        public async Task<Person?> GetPerson(string nationalIdentityNumber, string lastName, int activeUser)
        {
            string uniqueCacheKey = $"GetPerson_{nationalIdentityNumber}_{lastName}";

            if (_memoryCache.TryGetValue(uniqueCacheKey, out Person? person))
            {
                return person;
            }

            person = await _decoratedService.GetPerson(nationalIdentityNumber, lastName, activeUser);

            if (person is not null)
            {
                _memoryCache.Set(uniqueCacheKey, person, _memoryCacheOptions);
            }

            return person;
        }
    }
}
