#nullable disable
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.ResourceRegistry.Core.Models;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Client responsible for collection
    /// </summary>
    public class OrgService : IOrgService
    {
        private readonly HttpClient _client;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Default constructor
        /// </summary>
        public OrgService(HttpClient client, GeneralSettings generalSettingsOptions)
        {
            _client = client;
            _generalSettings = generalSettingsOptions;
        }

        /// <inheritdoc />
        public async Task<OrgList> GetOrgList(CancellationToken cancellationToken = default)
        {
            HttpResponseMessage response = await _client.GetAsync(_generalSettings.OrganizationsUrl, cancellationToken);
            response.EnsureSuccessStatusCode();
            string orgListString = await response.Content.ReadAsStringAsync(cancellationToken);
            OrgList orgList = System.Text.Json.JsonSerializer.Deserialize<OrgList>(orgListString, new System.Text.Json.JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });
            return orgList;
        }

        public async Task<Org> GetOrg(string orgCode)
        {
            OrgList orgList = await GetOrgList();

            if (orgList.Orgs.TryGetValue(orgCode, out Org organization))
            {
                return organization;
            }

            return null;
        }

        /// <inheritdoc />
        public async Task<bool> IsOrg(string nameToCheck, CancellationToken cancellationToken = default)
        {
            var orgList = await GetOrgList(cancellationToken);
            return orgList.Orgs.ContainsKey(nameToCheck);
        }
    }
}
