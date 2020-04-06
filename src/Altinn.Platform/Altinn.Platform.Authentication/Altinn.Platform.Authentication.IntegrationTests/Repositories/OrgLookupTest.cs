using System.Threading.Tasks;

using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Repositories;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.Platform.Authentication.IntegrationTests
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
            Mock<IOptions<GeneralSettings>> optionsMock = new Mock<IOptions<GeneralSettings>>();
            Mock<ILogger<OrganisationRepository>> loggerMock = new Mock<ILogger<OrganisationRepository>>();
            Mock<GeneralSettings> generalSettingsMock = new Mock<GeneralSettings>();
            GeneralSettings generalSettings = new GeneralSettings();
            generalSettings.OrganisationRepositoryLocation = "https://altinncdn.no/orgs/altinn-orgs.json";

            optionsMock
                .Setup(o => o.Value)
                .Returns(generalSettings);

            OrganisationRepository orgRepo = new OrganisationRepository(loggerMock.Object, optionsMock.Object);
            
            string org = await orgRepo.LookupOrg("974760223");

            Assert.Equal("dibk", org);

            string orgNumber = await orgRepo.LookupOrgNumber("brg");

            Assert.Equal("974760673", orgNumber);

            Organisation organisation = await orgRepo.GetOrganisationByOrg("nb");

            Assert.Equal("National Library of Norway", organisation.Name["en"]);
        }
    }
}
