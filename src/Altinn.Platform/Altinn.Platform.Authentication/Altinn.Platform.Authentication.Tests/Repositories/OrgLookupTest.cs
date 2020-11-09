using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Repositories;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
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
        private readonly IMemoryCache _memoryCache;
        private readonly HttpClient _client;
        private readonly Mock<ILogger<OrganisationRepository>> _loggerMock = new Mock<ILogger<OrganisationRepository>>();
        private readonly Mock<IOptions<GeneralSettings>> _optionsMock = new Mock<IOptions<GeneralSettings>>();

        public OrgLookupTest()
        {
            var services = new ServiceCollection();
            services.AddMemoryCache();
            var serviceProvider = services.BuildServiceProvider();

            _memoryCache = serviceProvider.GetService<IMemoryCache>();
            _client = new HttpClient();
        }

        /// <summary>
        /// Tests harvest orgs.
        /// </summary>
        [Fact]
        public async Task TestHarvestOrgs_OK()
        {
            // Arrange 
            GeneralSettings generalSettings = new GeneralSettings { OrganisationRepositoryLocation = "https://altinncdn.no/orgs/altinn-orgs.json" };

            _optionsMock.Setup(o => o.Value).Returns(generalSettings);

            OrganisationRepository orgRepo = new OrganisationRepository(_client, _memoryCache, _loggerMock.Object, _optionsMock.Object);

            // Act 
            string org = await orgRepo.LookupOrg("974760223");

            Assert.Equal("dibk", org);

            string orgNumber = await orgRepo.LookupOrgNumber("brg");

            Assert.Equal("974760673", orgNumber);

            Organisation organisation = await orgRepo.GetOrganisationByOrg("nbib");

            Assert.Equal("National Library of Norway", organisation.Name["en"]);
        }

        [Fact]
        public async Task GetOrganisationByOrgNumber_OrgReturnedFromCache()
        {
            // Arrange
            GeneralSettings generalSettings = new GeneralSettings { OrganisationRepositoryLocation = "https://invalidcdn.com" };
            _optionsMock.Setup(o => o.Value).Returns(generalSettings);

            string cacheKey = "org-974760223";
            Organisation org = new Organisation { Org = "dibk", OrgNumber = "974760223" };

            _memoryCache.Remove(cacheKey);
            _memoryCache.Set(cacheKey, org);

            OrganisationRepository orgRepo = new OrganisationRepository(_client, _memoryCache, _loggerMock.Object, _optionsMock.Object);

            // Act
            Organisation actual = await orgRepo.GetOrganisationByOrgNumber("974760223");

            // Assert
            Assert.NotNull(actual);
        }

        [Fact]
        public async Task GetOrganisationByOrgNumber_NoCache_CacheSuccessfullyPopulated()
        {
            // Arrange
            GeneralSettings generalSettings = new GeneralSettings { OrganisationRepositoryLocation = "https://altinncdn.no/orgs/altinn-orgs.json" };
            _optionsMock.Setup(o => o.Value).Returns(generalSettings);

            string expectedOrgNoKey = "org-974760673";
            string expectedOrgNameKey = "org-nbib";
            _memoryCache.Remove(expectedOrgNoKey);
            _memoryCache.Remove(expectedOrgNameKey);

            OrganisationRepository orgRepo = new OrganisationRepository(_client, _memoryCache, _loggerMock.Object, _optionsMock.Object);

            // Act
            Organisation actual = await orgRepo.GetOrganisationByOrgNumber("974760673");

            // Assert
            Assert.NotNull(actual);
            Assert.True(_memoryCache.TryGetValue(expectedOrgNoKey, out _));
            Assert.True(_memoryCache.TryGetValue(expectedOrgNameKey, out _));
        }
    }
}
