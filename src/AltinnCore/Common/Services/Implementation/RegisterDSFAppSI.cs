using System;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Common.Services.Implementation
{
    /// <inheritdoc />
    public class RegisterDSFAppSI : IDSF
    {
        private readonly ILogger _logger;
        private readonly PlatformSettings _platformSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterDSFAppSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="platformSettings">the platform settings</param>
        public RegisterDSFAppSI(ILogger<RegisterDSFAppSI> logger, PlatformSettings platformSettings)
        {
            _logger = logger;
            _platformSettings = platformSettings;
        }

        /// <inheritdoc/>
        public async Task<Person> GetPerson(string SSN)
        {
            Person person = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Person));

            Uri endpointUrl = new Uri($"{_platformSettings.ApiBaseEndpoint}v1/persons/{SSN}");
            using (HttpClient client = new HttpClient())
            {
                HttpResponseMessage response = await client.GetAsync(endpointUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    person = serializer.ReadObject(stream) as Person;
                }
                else
                {
                    _logger.LogError($"Getting person with ssn {SSN} failed with statuscode {response.StatusCode}");
                }
            }

            return person;
        }
    }
}
