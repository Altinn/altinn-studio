using Altinn.Platform.Authorization.Services.Interface;
using Authorization.Platform.Authorization.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Altinn.Platform.Authorization.IntegrationTests.MockServices
{
    public class Roles : IRoles
    {
        public Task<List<Role>> GetDecisionPointRolesForUser(int coveredByUserId, int offeredByPartyId)
        {
            List<Role> roles = new List<Role>();
            string rolesPath = GetRolesPath(coveredByUserId, offeredByPartyId);
            if (File.Exists(rolesPath))
            {
                string content = File.ReadAllText(rolesPath);
                roles = (List<Role>)JsonSerializer.Deserialize(content, typeof(List<Role>), new JsonSerializerOptions { PropertyNameCaseInsensitive = true});               
            }
            return Task.FromResult(roles);
        }

        private static string GetRolesPath(int coveredByUserId, int offeredByPartyId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(Roles).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Roles\user_" + coveredByUserId + @"\party_" + offeredByPartyId + @"\roles.json");
        }
    }

}
