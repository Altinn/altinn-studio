using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Authorization.Services.Interface;

using Authorization.Platform.Authorization.Models;

using LocalTest.Configuration;

using Microsoft.Extensions.Options;

using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// Wrapper for the roles api
    /// </summary>
    public class RolesWrapper : IRoles
    {
        private readonly LocalPlatformSettings _localPlatformSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="RolesWrapper"/> class
        /// </summary>
        /// <param name="rolesClient">the client handler for roles api</param>
        public RolesWrapper(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            this._localPlatformSettings = localPlatformSettings.Value;
        }

        /// <inheritdoc />
        public async Task<List<Role>> GetDecisionPointRolesForUser(int coveredByUserId, int offeredByPartyId)
        {
            string rolesPath = GetRolesPath(coveredByUserId, offeredByPartyId);

            List<Role> roles = new List<Role>();

            if (File.Exists(rolesPath))
            {
                string content = System.IO.File.ReadAllText(rolesPath);
                roles = (List<Role>)JsonConvert.DeserializeObject(content, typeof(List<Role>));
            }

            return await Task.FromResult(roles);
        }

        private string GetRolesPath(int userId, int resourcePartyId)
        {
            string[] pathArray = new string[] {
                this._localPlatformSettings.LocalTestingStaticTestDataPath,
                this._localPlatformSettings.AuthorizationDataFolder,
                this._localPlatformSettings.RolesFolder,
                $"User_{userId}/",
                $"party_{resourcePartyId}/",
                "roles.json"
            };
            return Path.Combine(pathArray);
        }
    }
}
