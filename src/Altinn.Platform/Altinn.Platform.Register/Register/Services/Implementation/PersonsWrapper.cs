using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Platform.Register.Configuration;
using Altinn.Platform.Register.Helpers;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Register.Services.Interfaces;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Register.Services.Implementation
{
    /// <summary>
    /// The persons wrapper.
    /// </summary>
    public class PersonsWrapper : IPersons
    {
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="PersonsWrapper"/> class.
        /// </summary>
        /// <param name="generalSettings">The GeneralSettings section of appsettings.</param>
        /// <param name="logger">The logger.</param>
        public PersonsWrapper(IOptions<GeneralSettings> generalSettings, ILogger<PersonsWrapper> logger)
        {
            _generalSettings = generalSettings.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<Person> GetPerson(string ssn)
        {
            Uri endpointUrl = new Uri($"{_generalSettings.BridgeApiEndpoint}persons");

            using (HttpClient client = HttpApiHelper.GetApiClient())
            {
                StringContent requestBody = new StringContent(JsonSerializer.Serialize(ssn), Encoding.UTF8, "application/json");

                HttpResponseMessage response = await client.PostAsync(endpointUrl, requestBody);

                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    return await JsonSerializer.DeserializeAsync<Person>(await response.Content.ReadAsStreamAsync());
                }
                else
                {
                    _logger.LogError($"Getting person with ssn {ssn} failed with statuscode {response.StatusCode}");
                }
            }

            return null;
        }
    }
}
