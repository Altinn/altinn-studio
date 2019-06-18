using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Clients;
using Altinn.Platform.Authorization.Services.Interface;
using Authorization.Interface.Models;
using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// Wrapper for the actors api
    /// </summary>
    public class ActorsWrapper : IActor
    {
        private readonly ActorClient _actorClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="ActorsWrapper"/> class
        /// </summary>
        /// <param name="actorClient">the client handler for actor api</param>
        public ActorsWrapper(ActorClient actorClient)
        {
            _actorClient = actorClient;
        }

        /// <inheritdoc />
        public async Task<List<Actor>> GetActors(int userId)
        {            
            List<Actor> actorList = null;

            var request = $"actors?userid={userId}";

            var response = await _actorClient.Client.GetAsync(request);            
            string actorDataList = await response.Content.ReadAsStringAsync();
            response.EnsureSuccessStatusCode();
            actorList = JsonConvert.DeserializeObject<List<Actor>>(actorDataList);
            return actorList;
        }
    }
}
