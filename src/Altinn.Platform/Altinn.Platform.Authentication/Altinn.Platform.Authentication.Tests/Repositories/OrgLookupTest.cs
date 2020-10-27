using System.Threading.Tasks;

using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Repositories;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;
using Xunit;

namespace Altinn.Platform.Authentication.Tests.Repositories
{
    /// <summary>
    /// Testclass for harvesting orgs.
    /// </summary>
    public class OrgLookupTest
    {
        /// <summary>
        /// Tests harvest orgs.
        /// </summary>
        [Fact]
        public async Task TestHarvestOrgs_OK()
        {
            Mock<ILogger<OrganisationRepository>> loggerMock = new Mock<ILogger<OrganisationRepository>>();

            GeneralSettings generalSettings = new GeneralSettings { OrganisationRepositoryLocation = "https://altinncdn.no/orgs/altinn-orgs.json" };

            Mock<IOptions<GeneralSettings>> optionsMock = new Mock<IOptions<GeneralSettings>>();
            optionsMock.Setup(o => o.Value).Returns(generalSettings);

            OrganisationRepository orgRepo = new OrganisationRepository(loggerMock.Object, optionsMock.Object);
            
            string org = await orgRepo.LookupOrg("974760223");

            Assert.Equal("dibk", org);

            string orgNumber = await orgRepo.LookupOrgNumber("brg");

            Assert.Equal("974760673", orgNumber);

            Organisation organisation = await orgRepo.GetOrganisationByOrg("nbib");

            Assert.Equal("National Library of Norway", organisation.Name["en"]);
        }
    }
}
