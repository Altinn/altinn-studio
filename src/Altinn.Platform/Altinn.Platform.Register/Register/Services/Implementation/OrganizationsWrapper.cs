using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Platform.Register.Configuration;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Register.Services.Interfaces;

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
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="OrganizationsWrapper"/> class
        /// </summary>
        /// <param name="httpClient">HttpClient from default httpclientfactory</param>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        public OrganizationsWrapper(HttpClient httpClient, IOptions<GeneralSettings> generalSettings, ILogger<OrganizationsWrapper> logger)
        {
            _generalSettings = generalSettings.Value;
            _logger = logger;
            _client = httpClient;
        }

        /// <inheritdoc />
        public async Task<Organization> GetOrganization(string orgNr)
        {
            Uri endpointUrl = new Uri($"{_generalSettings.BridgeApiEndpoint}organizations/{orgNr}");

            HttpResponseMessage response = await _client.GetAsync(endpointUrl);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                return await JsonSerializer.DeserializeAsync<Organization>(await response.Content.ReadAsStreamAsync());
            }
            else
            {
                _logger.LogError("Getting org with org nr {OrgNr} failed with statuscode {StatusCode}", orgNr, response.StatusCode);
            }

            return null;
        }
    }
}
