using System.Collections.Generic;
using System.Net.Http;
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
    /// Wrapper for the roles api
    /// </summary>
    public class RolesWrapper : IRoles
    {
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger _logger;
        private readonly RolesClient _rolesClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="ActorsWrapper"/> class
        /// </summary>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        /// <param name="rolesClient">the client handler for roles api</param>
        public RolesWrapper(IOptions<GeneralSettings> generalSettings, ILogger<ActorsWrapper> logger, RolesClient rolesClient)
        {
            _generalSettings = generalSettings.Value;
            _logger = logger;
            _rolesClient = rolesClient;
        }

        /// <inheritdoc />
        public async Task<List<Role>> GetDecisionPointRolesForUser(int coveredByUserId, int offeredByPartyId)
        {
            List<Role> decisionPointRoles = null;
            string apiurl = $"roles?coveredByUserId={coveredByUserId}&offeredByPartyId={offeredByPartyId}";

            var response = await _rolesClient.Client.GetAsync(apiurl);           
            string roleList = await response.Content.ReadAsStringAsync();
            response.EnsureSuccessStatusCode();
            decisionPointRoles = JsonConvert.DeserializeObject<List<Role>>(roleList);            

            return decisionPointRoles;
        }
    }
}
