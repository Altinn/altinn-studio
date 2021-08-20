using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Exceptions;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Altinn.Platform.Authentication.Services
{
    /// <summary>
    /// Responsible for looking up the valid organisation list and returning the org identifier. See LookupOrg method.
    /// </summary>
    public class OrganisationsService : IOrganisationsService
    {
        private readonly IMemoryCache _memoryCache;
        private readonly MemoryCacheEntryOptions _cacheEntryOptions;

        private readonly HttpClient _httpClient;
        private readonly ILogger _logger;

        private readonly Uri _organisationListLocation;

        private readonly string _orgDictionaryCacheKey = "organisationDictionary";

        /// <summary>
        /// Instantiates the class.
        /// </summary>
        /// <param name="httpClient">the http client</param>
        /// <param name="memoryCache">the memory cache</param>
        /// <param name="logger">the logger</param>
        /// <param name="generalSettings">the settings which contains the url to the json organisation file</param>
        public OrganisationsService(HttpClient httpClient, IMemoryCache memoryCache, ILogger<OrganisationsService> logger, IOptions<GeneralSettings> generalSettings)
        {
            _httpClient = httpClient;
            _logger = logger;
            _organisationListLocation = new Uri(generalSettings.Value.OrganisationRepositoryLocation);

            _memoryCache = memoryCache;
            _cacheEntryOptions = new MemoryCacheEntryOptions()
                .SetPriority(CacheItemPriority.Normal)
                .SetAbsoluteExpiration(new TimeSpan(1, 0, 0));
        }

        /// <inheritdoc/>
        public async Task<string> LookupOrg(string orgNumber)
        {
            Organisation organisation;

            if (!_memoryCache.TryGetValue(_orgDictionaryCacheKey, out Dictionary<string, Organisation> organisationDictionary))
            {
                organisationDictionary = await HarvestOrgs();
            }

            organisationDictionary.TryGetValue(orgNumber, out organisation);

            return organisation?.Org;
        }

        private async Task<Dictionary<string, Organisation>> HarvestOrgs()
        {
            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync(_organisationListLocation);

                response.EnsureSuccessStatusCode();

                JObject orgs = JObject.Parse(await response.Content.ReadAsStringAsync());

                orgs = (JObject)orgs.GetValue("orgs");

                Dictionary<string, Organisation> organisationHarvest = JsonConvert.DeserializeObject<Dictionary<string, Organisation>>(orgs.ToString());

                if (organisationHarvest.Count == 0)
                {
                    throw new OrganisationHarvestException($"Organisation list is empty!");
                }

                Dictionary<string, Organisation> organisationDictionary = new Dictionary<string, Organisation>();

                foreach (KeyValuePair<string, Organisation> element in organisationHarvest)
                {
                    Organisation candidateOrganisation = element.Value;
                    candidateOrganisation.Org = element.Key;

                    string orgNumber = candidateOrganisation.OrgNumber;

                    if (string.IsNullOrEmpty(orgNumber))
                    {
                        _logger.LogWarning($"Organisation {candidateOrganisation.ToString()} is missing orgNumber and will not be part of orgNumberToOrganisation map!");
                    }

                    organisationDictionary.Add(orgNumber, candidateOrganisation);
                }

                _memoryCache.Set(_orgDictionaryCacheKey, organisationDictionary, _cacheEntryOptions);
                return organisationDictionary;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Unable to harvest organisation data due to {ex}");

                throw new OrganisationHarvestException($"Unable to harvest organisations from {_organisationListLocation}.", ex);
            }
        }
    }
}
