using System;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using IRegister = AltinnCore.ServiceLibrary.Services.Interfaces.IRegister;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Register service for service development. Uses local disk to store register data
    /// </summary>
    public class RegisterAppSI : IRegister
    {
        private readonly IDSF _dsf;
        private readonly IER _er;
        private readonly ILogger _logger;
        private readonly PlatformSettings _platformSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterAppSI"/> class
        /// </summary>
        /// <param name="dfs">The dfs</param>
        /// <param name="er">The er</param>
        /// <param name="logger">The logger</param>
        /// <param name="platformSettings">The platform settings</param>
        public RegisterAppSI(IDSF dfs, IER er, ILogger<RegisterAppSI> logger, IOptions<PlatformSettings> platformSettings)
        {
            _dsf = dfs;
            _er = er;
            _logger = logger;
            _platformSettings = platformSettings.Value;
        }

        /// <summary>
        /// The access to the dsf component through register services
        /// </summary>
        public IDSF DSF
        {
            get { return _dsf; }
            protected set { }
        }

        /// <summary>
        /// The access to the er component through register services
        /// </summary>
        public IER ER
        {
            get { return _er; }
            protected set { }
        }

        /// <inheritdoc/>
        public async Task<Party> GetParty(int partyId)
        {
            Party party = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Party));

            Uri endpointUrl = new Uri($"{_platformSettings.GetApiBaseEndpoint()}v1/party/{partyId}");
            using (HttpClient client = new HttpClient())
            {
                HttpResponseMessage response = await client.GetAsync(endpointUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    party = await response.Content.ReadAsAsync<Party>();
                }
                else
                {
                    _logger.LogError($"Getting party with partyID {partyId} failed with statuscode {response.StatusCode}");
                }
            }

            return party;
        }
    }
}
