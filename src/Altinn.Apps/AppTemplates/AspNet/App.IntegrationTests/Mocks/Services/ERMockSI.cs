using System.Threading.Tasks;
using Altinn.App.Services.Interface;
using Altinn.Platform.Register.Models;

namespace App.IntegrationTests.Mocks.Services
{
    public class ERMockSI : IER
    {
        public Task<Organization> GetOrganization(string OrgNr)
        {
            return Task.FromResult(new Organization
            {
                OrgNumber = OrgNr,
            });
        }
    }
}
