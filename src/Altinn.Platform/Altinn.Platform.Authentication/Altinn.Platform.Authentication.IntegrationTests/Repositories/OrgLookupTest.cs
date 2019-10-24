using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Repositories;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.Platform.Authentication.Repositories
{
    /// <summary>
    /// blblblb
    /// </summary>
    public class OrgLookupTest
    {
        /// <summary>
        /// Tests harvest orgs
        /// </summary>
        [Fact]
        public void TestHarvestOrgs_OK()
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
            
            string org = orgRepo.LookupOrg("974760223");

            Assert.Equal("dibk", org);
        }
    }
}
