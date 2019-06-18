using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Clients;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Services.Interface;
using Authorization.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// Wrapper for the actors api
    /// </summary>
    public class ActorsWrapper : IActor
    {
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger _logger;
        private readonly ActorClient _actorClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="ActorsWrapper"/> class
        /// </summary>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        /// <param name="actorClient">the client handler for actor api</param>
        public ActorsWrapper(IOptions<GeneralSettings> generalSettings, ILogger<ActorsWrapper> logger, ActorClient actorClient)
        {
            _generalSettings = generalSettings.Value;
            _logger = logger;
            _actorClient = actorClient;
        }

        /// <inheritdoc />
        public async Task<List<Actor>> GetActors(int userId)
        {            
            List<Actor> actorList = new List<Actor>();

            Actor testActor = new Actor()
            {
                SSN = "123456",
                Name = "test",
                PartyID = 54321
            };

            actorList.Add(testActor);

            // var request = new HttpRequestMessage(
            //    HttpMethod.Get,
            //    "actors");

            // using (var response = await _actorClient.Client.SendAsync(
            //                                request,
            //                                HttpCompletionOption.ResponseHeadersRead))
            // {
            //    string actorDataList = await response.Content.ReadAsStringAsync();
            //    response.EnsureSuccessStatusCode();
            //    actorList = JsonConvert.DeserializeObject<List<Actor>>(actorDataList);
            // }
            return actorList;
        }
    }
}
