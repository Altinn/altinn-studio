using System;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using Altinn.Platform.Register.Configuration;
using Altinn.Platform.Register.Helpers;
using Altinn.Platform.Register.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Register.Services.Implementation
{
    /// <summary>
    /// The organization wrapper
    /// </summary>
    public class OrganizationsWrapper : IOrganizations
    {
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="OrganizationsWrapper"/> class
        /// </summary>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        public OrganizationsWrapper(IOptions<GeneralSettings> generalSettings, ILogger<OrganizationsWrapper> logger)
        {
            _generalSettings = generalSettings.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<Organization> GetOrganization(string orgNr)
        {
            Organization org = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Organization));
            Uri endpointUrl = new Uri($"{_generalSettings.GetApiBaseUrl()}/organizations/{orgNr}");
            using (HttpClient client = HttpApiHelper.GetApiClient())
            {
                HttpResponseMessage response = await client.GetAsync(endpointUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    org = serializer.ReadObject(stream) as Organization;
                }
                else
                {
                    _logger.LogError($"Getting org with org nr {orgNr} failed with statuscode {response.StatusCode}");
                }
            }

            return org;
        }
    }
}
