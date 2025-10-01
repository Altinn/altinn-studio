using Altinn.Notifications.Core.Integrations;
using Altinn.Notifications.Core.Models.ContactPoints;

using LocalTest.Services.TestData;

namespace LocalTest.Notifications.LocalTestNotifications
{
    public class LocalRegisterClient : IRegisterClient
    {
        private readonly TestDataService _testDataService;

        public LocalRegisterClient(TestDataService testDataService)
        {
            _testDataService = testDataService;
        }

        public async Task<List<OrganizationContactPoints>> GetOrganizationContactPoints(List<string> organizationNumbers)
        {
            var data = await _testDataService.GetTestData();

            List<OrganizationContactPoints> orgContactPoints = new();


            orgContactPoints.AddRange(data.Register.Org
                .Where(o => organizationNumbers.Contains(o.Value.OrgNumber))
                .Select(o =>
                    {
                        var organization = o.Value;
                        return new OrganizationContactPoints()
                        {
                            OrganizationNumber = organization.OrgNumber,
                            EmailList = new List<string>() { organization.EMailAddress },
                            MobileNumberList = new List<string>() { organization.MobileNumber }
                        };
                    })
                .ToList());

            return orgContactPoints;
        }
    }
}
