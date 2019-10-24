using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using Altinn.Platform.Authentication.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json.Linq;

namespace Altinn.Platform.Authentication.Repositories
{
    /// <summary>
    /// Responsible for looking up the valid organisation list and returning the org identifier. See LookupOrg method.
    /// </summary>
    public class OrganisationRepository : IOrganisationRepository
    {
        private static Dictionary<string, string> orgNumberToOrg = new Dictionary<string, string>();
        private static DateTime dictionaryLastUpdated = DateTime.MinValue;

        private static readonly HttpClient HttpClient = new HttpClient();
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

        /// <summary>
        /// Gets the organisation identifier of the org. Usually a 2-4 character short form of organisation name. Organisation numbers are updated if there is more than an hour since last harvest.
        /// </summary>
        /// <param name="organisationNumber">the organisation number as given in the central unit registry</param>
        /// <returns>the organisation identifier</returns>
        public string LookupOrg(string organisationNumber)
        {
            DateTime timestamp = DateTime.Now;
            timestamp = timestamp.AddHours(-1);

            if (dictionaryLastUpdated < timestamp || orgNumberToOrg.Count == 0)
            {
                HarvestOrgs();
            }

            return orgNumberToOrg.GetValueOrDefault(organisationNumber, null);
        }

        /// <summary>
        /// Harvests organisations from valid altinn application owner lists. Updates a dictionary of organisationNumber -> org. 
        /// </summary>
        public void HarvestOrgs()
        {
            int countNew = 0;
            int countUpdated = 0;

            logger.LogInformation($"Authentication harvest of organisation from '{organisationListLocation}' start.");

            try
            {
                HttpResponseMessage response = HttpClient.GetAsync(organisationListLocation).Result;

                response.EnsureSuccessStatusCode();

                JObject orgs = JObject.Parse(response.Content.ReadAsStringAsync().Result);

                orgs = (JObject)orgs.GetValue("orgs");

                foreach (JToken prop in orgs.Children())
                {
                    JObject orgObject = (JObject)prop.Children().First();
                    string orgnr = orgObject["orgnr"].ToString();
                    string org = ((JProperty)prop).Name;

                    if (orgNumberToOrg.ContainsKey(orgnr))
                    {
                        if (!org.Equals(orgNumberToOrg[orgnr]))
                        {
                            orgNumberToOrg.Remove(orgnr);
                            orgNumberToOrg.Add(orgnr, org);
                            countUpdated++;
                        }
                    }
                    else
                    {
                        orgNumberToOrg.Add(orgnr, org);
                        countNew++;
                    }
                }

                dictionaryLastUpdated = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                logger.LogError($"Unable to harvest organisation data due to {ex}");
                if (orgNumberToOrg.Count > 0)
                {
                    logger.LogWarning($"Continuing with stale organisation cache. Cache now contains {orgNumberToOrg.Count} organisationNumber to org entries.");
                }
            }

            logger.LogInformation($"Authentication harvest of organisations finished. Resulting in {countNew} new and {countUpdated} organisations in cache.");
        }
    }
}
