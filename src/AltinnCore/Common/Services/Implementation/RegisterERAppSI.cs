using System;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Register er service for service development.
    /// </summary>
    public class RegisterERAppSI : IER
    {
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterERAppSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        public RegisterERAppSI(ILogger<RegisterERAppSI> logger)
        {
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<Organization> GetOrganization(string OrgNr)
        {
            Organization organization = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Organization));

            // TODO: add path to platform to settingsfile
            Uri endpointUrl = new Uri($"http://platform.altinn.cloud/api/v1/persons/{OrgNr}");
            using (HttpClient client = new HttpClient())
            {
                HttpResponseMessage response = await client.GetAsync(endpointUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    organization = serializer.ReadObject(stream) as Organization;
                }
                else
                {
                    _logger.LogError($"Getting organization with orgnr {OrgNr} failed with statuscode {response.StatusCode}");
                }
            }

            return organization;
        }
    }
}
