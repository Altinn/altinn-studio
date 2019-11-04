using Altinn.Platform.Authorization.Services.Interface;
using Authorization.Interface.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace Altinn.Platform.Authorization.IntegrationTests.MockServices
{
    public class PolicyInformationPoint : IRoles
    {
        public Task<List<Role>> GetDecisionPointRolesForUser(int coveredByUserId, int offeredByPartyId)
        {
            string rolesPath = GetRolesPath(coveredByUserId, offeredByPartyId);

            List<Role> roles = new List<Role>();

            if (File.Exists(rolesPath))
            {
                string content = System.IO.File.ReadAllText(rolesPath);
                roles = (List<Role>)JsonConvert.DeserializeObject(content, typeof(List<Role>));
            }

            return Task.FromResult(roles);
        }

        private string GetRolesPath(int userId, int resourcePartyId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnApps_DecisionTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Roles\User_" + userId + @"\party_" + resourcePartyId + @"\roles.json");
        }
    }
}
