using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Clients;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Services.Interface;
using Authorization.Interface.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// Wrapper for the roles api
    /// </summary>
    public class RolesWrapper : IRoles
    {
        private readonly RolesClient _rolesClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="RolesWrapper"/> class
        /// </summary>
        /// <param name="rolesClient">the client handler for roles api</param>
        public RolesWrapper(RolesClient rolesClient)
        {
            _rolesClient = rolesClient;
        }

        /// <inheritdoc />
        public async Task<List<Role>> GetDecisionPointRolesForUser(int coveredByUserId, int offeredByPartyId)
        {
            List<Role> decisionPointRoles = new List<Role>();
            string apiurl = $"roles?coveredByUserId={coveredByUserId}&offeredByPartyId={offeredByPartyId}";

            HttpResponseMessage response = await _rolesClient.Client.GetAsync(apiurl);
            string roleList = await response.Content.ReadAsStringAsync();
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                decisionPointRoles = JsonConvert.DeserializeObject<List<Role>>(roleList);
            }

            return decisionPointRoles;
        }
    }
}
