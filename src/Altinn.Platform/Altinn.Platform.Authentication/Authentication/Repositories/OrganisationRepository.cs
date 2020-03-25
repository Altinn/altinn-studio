using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Altinn.Platform.Authentication.Repositories
{
    /// <summary>
    /// Responsible for looking up the valid organisation list and returning the org identifier. See LookupOrg method.
    /// </summary>
    public class OrganisationRepository : IOrganisationRepository
    {
        private Dictionary<string, Organisation> orgNumberToOrganisation = new Dictionary<string, Organisation>();
        private Dictionary<string, Organisation> orgToOrganisation = new Dictionary<string, Organisation>();
        private DateTime dictionaryLastUpdated = DateTime.MinValue;

        private readonly HttpClient _httpClient = new HttpClient();
        private readonly ILogger logger;

        private readonly Uri organisationListLocation;

        /// <summary>
        /// Instantiates the class.
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="generalSettings">the settings which contains the url to the json organisation file</param>
        public OrganisationRepository(ILogger<OrganisationRepository> logger, IOptions<GeneralSettings> generalSettings)
        {
            this.logger = logger;
            organisationListLocation = new Uri(generalSettings.Value.GetOrganisationRepositoryLocation);
        }

        /// <inheritdoc/>
        public async Task<Organisation> GetOrganisationByOrgNumber(string orgNumber)
        {
            await HarvestOrgsIfCacheIsMoreThanOneHourOld();

            return orgNumberToOrganisation.GetValueOrDefault(orgNumber, null);
        }

        /// <inheritdoc/>
        public async Task<Organisation> GetOrganisationByOrg(string org)
        {
            await HarvestOrgsIfCacheIsMoreThanOneHourOld();

            return orgToOrganisation.GetValueOrDefault(org, null);
        }

        /// <inheritdoc/>
        public async Task<string> LookupOrg(string orgNumber)
        {
            await HarvestOrgsIfCacheIsMoreThanOneHourOld();

            Organisation organisation = orgNumberToOrganisation.GetValueOrDefault(orgNumber, null);

            return organisation?.Org;
        }

        /// <inheritdoc/>
        public async Task<string> LookupOrgNumber(string org)
        {
            await HarvestOrgsIfCacheIsMoreThanOneHourOld();

            Organisation organisation = orgToOrganisation.GetValueOrDefault(org, null);

            return organisation?.OrgNumber;
        }

        private async Task HarvestOrgsIfCacheIsMoreThanOneHourOld()
        {
            DateTime timestamp = DateTime.Now;
            timestamp = timestamp.AddHours(-1);

            if (dictionaryLastUpdated < timestamp || orgNumberToOrganisation.Count == 0)
            {
               await HarvestOrgs();
            }
        }

        /// <inheritdoc/>
        public async Task HarvestOrgs()
        {
            logger.LogInformation($"Authentication harvest of organisation from '{organisationListLocation}' starts.");

            Dictionary<string, Organisation> organisationHarvest = null;
            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync(organisationListLocation);

                response.EnsureSuccessStatusCode();

                JObject orgs = JObject.Parse(await response.Content.ReadAsStringAsync());

                orgs = (JObject)orgs.GetValue("orgs");

                organisationHarvest = JsonConvert.DeserializeObject<Dictionary<string, Organisation>>(orgs.ToString());

                if (organisationHarvest.Count == 0)
                {
                    throw new OrganisationHarvestException($"Organisation list is empty!");
                }

                logger.LogInformation($"Found {organisationHarvest.Count} organisations which replaces current cache wich contained {orgToOrganisation.Count} organisations.");

                orgToOrganisation.Clear();
                orgNumberToOrganisation.Clear();

                foreach (KeyValuePair<string, Organisation> element in organisationHarvest)
                {
                    Organisation candidateOrganisation = element.Value;
                    candidateOrganisation.Org = element.Key;

                    string orgNumber = candidateOrganisation.OrgNumber;
                    string org = candidateOrganisation.Org;

                    if (string.IsNullOrEmpty(org))
                    {
                        logger.LogWarning($"Organisation {candidateOrganisation.ToString()} is missing org value and will not be part of orgToOrganisation map!");
                    }
                    else
                    {
                        orgToOrganisation.Add(org, candidateOrganisation);
                    }
                    
                    if (string.IsNullOrEmpty(orgNumber))
                    {
                        logger.LogWarning($"Organisation {candidateOrganisation.ToString()} is missing orgNumber and will not be part of orgNumberToOrganisation map!");                        
                    }
                    else
                    {
                        orgNumberToOrganisation.Add(orgNumber, candidateOrganisation);
                    }
                }

                dictionaryLastUpdated = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                logger.LogError($"Unable to harvest organisation data due to {ex}");
                if (orgNumberToOrganisation.Count > 0)
                {
                    logger.LogWarning($"Managed to harvest {orgNumberToOrganisation.Count} organisations of total {organisationHarvest?.Count} in file.");
                    return;
                }

                throw new OrganisationHarvestException($"Unable to harvest organisations from {organisationListLocation}.", ex);
            }

            logger.LogInformation($"Authentication harvest of organisations finished. Resulting in {orgNumberToOrganisation.Count} organisations in cache.");
        }
    }
}
