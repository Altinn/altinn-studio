using System;
using System.IO;
using System.Threading.Tasks;

using Altinn.App.Services.Interface;
using Altinn.Platform.Register.Models;

using Newtonsoft.Json;

namespace App.IntegrationTests.Mocks.Services
{
    public class ERMockSI : IER
    {
        public Task<Organization> GetOrganization(string OrgNr)
        {
            string orgPath = GetOrganizationPath(OrgNr);
            if (File.Exists(orgPath))
            {
                string content = File.ReadAllText(orgPath);
                Organization org = JsonConvert.DeserializeObject<Organization>(content);
                return Task.FromResult(org);
            }

            return null;
        }

        private string GetOrganizationPath(string OrgNr)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ERMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Register\Org", OrgNr + ".json");
        }
    }
}
