using System.IO;
using System.Threading.Tasks;
using AltinnCore.ServiceLibrary.Models;
using LocalTest.Configuration;
using LocalTest.Services.Register.Interface;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace LocalTest.Services.Register.Implementation
{
    /// <summary>
    /// The organization wrapper
    /// </summary>
    public class OrganizationsWrapper : IOrganizations
    {
        private readonly LocalPlatformSettings _localPlatformSettings;

        public OrganizationsWrapper(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        /// <inheritdoc />
        public async Task<Organization> GetOrganization(string orgNr)
        {
            Organization org = null;
            string path = this._localPlatformSettings.LocalTestingStaticTestDataPath + "Register/Org/" + orgNr + ".json";
            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);
                org = (Organization)JsonConvert.DeserializeObject(content, typeof(Organization));
            }

            return org;
        }
    }
}
