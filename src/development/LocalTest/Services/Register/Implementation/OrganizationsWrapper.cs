#nullable enable
using Altinn.Platform.Register.Models;
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

        public OrganizationsWrapper(TestDataService testDataService)
        {
            _testDataService = testDataService;
        }

        /// <inheritdoc />
        public async Task<Organization?> GetOrganization(string orgNr)
        {
            var data = await _testDataService.GetTestData();
            return data.Register.Org.TryGetValue(orgNr, out var value) ? value : null;
        }
    }
}
