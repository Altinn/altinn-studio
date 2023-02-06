#nullable enable
using Altinn.Platform.Register.Models;
using LocalTest.Clients.CdnAltinnOrgs;
using LocalTest.Services.Register.Interface;
using LocalTest.Services.TestData;

namespace LocalTest.Services.Register.Implementation
{
    /// <summary>
    /// The organization wrapper
    /// </summary>
    public class OrganizationsWrapper : IOrganizations
    {
        private readonly TestDataService _testDataService;
        private readonly AltinnOrgsClient _orgsClient;

        public OrganizationsWrapper(TestDataService testDataService, AltinnOrgsClient orgsClient)
        {
            _testDataService = testDataService;
            _orgsClient = orgsClient;
        }

        /// <inheritdoc />
        public async Task<Organization?> GetOrganization(string orgNr)
        {
            var data = await _testDataService.GetTestData();

            if (data.Register.Org.TryGetValue(orgNr, out var value))
            {
                return value;
            }

            // Make lookup work for all the orgs that has apps in altinn.
            var cdnOrgs = await _orgsClient.GetCdnOrgs();
            var cdnOrg = cdnOrgs?.Orgs?.Values.FirstOrDefault(org=>org.Orgnr == orgNr);
            if(cdnOrg is not null)
            {
                return new Organization
                {
                    Name = cdnOrg.Name?.Nb,
                    OrgNumber = cdnOrg.Orgnr,
                };
            }
            return null;
        }
    }
}
