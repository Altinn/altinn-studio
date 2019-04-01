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
    /// The persons wrapper
    /// </summary>
    public class PersonsWrapper : IPersons
    {
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="PersonsWrapper"/> class
        /// </summary>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        public PersonsWrapper(IOptions<GeneralSettings> generalSettings, ILogger<PersonsWrapper> logger)
        {
            _generalSettings = generalSettings.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<Person> GetPerson(string ssn)
        {
            Person person = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Person));
            Uri endpointUrl = new Uri($"{_generalSettings.GetApiBaseUrl()}/persons/{ssn}");
            using (HttpClient client = HttpApiHelper.GetApiClient())
            {
                HttpResponseMessage response = await client.GetAsync(endpointUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    person = serializer.ReadObject(stream) as Person;
                }
                else
                {
                    _logger.LogError($"Getting person with ssn {ssn} failed with statuscode {response.StatusCode}");
                }
            }

            return person;
        }
    }
}
