using System;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Register dsf service for service development.
    /// </summary>
    public class RegisterDSFSIPlatform : IDSF
    {
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterDSFSIPlatform"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        public RegisterDSFSIPlatform(ILogger<RegisterDSFSIPlatform> logger)
        {
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Person GetPerson(string SSN)
        {
            Person person = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Person));
            // TODO: add path to platform to settingsfile
            Uri endpointUrl = new Uri($"http://platform.altinn.cloud/api/v1/persons/{SSN}");
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
