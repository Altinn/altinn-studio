using System.Collections.Generic;
using System.Net.Http;
using System.Text;
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
using Moq.Protected;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.Platform.Authentication.Tests.Repositories
{
    /// <summary>
    /// Testclass for harvesting orgs.
    /// </summary>
    public class OrganisationRepositoryTest
    {
        private readonly IMemoryCache _memoryCache;
        private readonly Mock<ILogger<OrganisationRepository>> _loggerMock;
        private readonly Mock<IOptions<GeneralSettings>> _optionsMock;

        public OrganisationRepositoryTest()
        {
            _optionsMock = new Mock<IOptions<GeneralSettings>>();
            GeneralSettings generalSettings = new GeneralSettings { OrganisationRepositoryLocation = "https://mock.com/altinn-orgs.json" };
            _optionsMock.Setup(o => o.Value).Returns(generalSettings);
            _loggerMock = new Mock<ILogger<OrganisationRepository>>();
            _memoryCache = new MemoryCache(new MemoryCacheOptions());
        }

        /// <summary>
        /// Tests harvest orgs.
        /// </summary>
        [Fact]
        public async Task LookupOrg_NoCache_CacheSuccessfullyPopulated()
        {
            // Arrange
            string expectedOrgNoKey = "org-974760223";
            string expectedOrgNameKey = "org-dibk";

            HttpClient httpClient = GetTestHttpClient();
            OrganisationRepository orgRepo = new OrganisationRepository(httpClient, _memoryCache, _loggerMock.Object, _optionsMock.Object);

            // Act 
            string org = await orgRepo.LookupOrg("974760223");

            // Assert
            Assert.Equal("dibk", org);
            Assert.True(_memoryCache.TryGetValue(expectedOrgNoKey, out _));
            Assert.True(_memoryCache.TryGetValue(expectedOrgNameKey, out _));
        }

        [Fact]
        public async Task LookupOrgNumber_NoCache_CacheSuccessfullyPopulated()
        {
            // Arrange
            string expectedOrgNoKey = "org-974760673";
            string expectedOrgNameKey = "org-brg";
            _memoryCache.Remove(expectedOrgNoKey);
            _memoryCache.Remove(expectedOrgNameKey);

            HttpClient httpClient = GetTestHttpClient();
            OrganisationRepository orgRepo = new OrganisationRepository(httpClient, _memoryCache, _loggerMock.Object, _optionsMock.Object);

            // Act
            Organisation actual = await orgRepo.GetOrganisationByOrgNumber("974760673");

            // Assert
            Assert.NotNull(actual);
            Assert.True(_memoryCache.TryGetValue(expectedOrgNoKey, out _));
            Assert.True(_memoryCache.TryGetValue(expectedOrgNameKey, out _));
        }

        [Fact]
        public async Task GetOrganisationByOrg_OrgReturnedFromCache()
        {
            // Arrange
            string cacheKey = "org-nbib";
            Organisation org = new Organisation
            {
                Org = "nbib",
                OrgNumber = "976029100",
                Name = new Dictionary<string, string>
                {
                    ["en"] = "National Library of Norway",
                    ["nb"] = "Nasjonalbiblioteket"
                }
            };

            _memoryCache.Remove(cacheKey);
            _memoryCache.Set(cacheKey, org);

            OrganisationRepository orgRepo = new OrganisationRepository(null, _memoryCache, _loggerMock.Object, _optionsMock.Object);

            // Act
            Organisation organisation = await orgRepo.GetOrganisationByOrg("nbib");

            // Assert
            Assert.Equal("National Library of Norway", organisation.Name["en"]);
        }

        [Fact]
        public async Task GetOrganisationByOrgNumber_OrgReturnedFromCache()
        {
            // Arrange
            string cacheKey = "org-974760223";
            Organisation org = new Organisation { Org = "dibk", OrgNumber = "974760223" };

            _memoryCache.Remove(cacheKey);
            _memoryCache.Set(cacheKey, org);

            OrganisationRepository orgRepo = new OrganisationRepository(null, _memoryCache, _loggerMock.Object, _optionsMock.Object);

            // Act
            Organisation actual = await orgRepo.GetOrganisationByOrgNumber("974760223");

            // Assert
            Assert.NotNull(actual);
        }

        [Fact]
        public async Task GetOrganisationByOrgNumber_NoCache_CacheSuccessfullyPopulated()
        {
            // Arrange
            string expectedOrgNoKey = "org-976029100";
            string expectedOrgNameKey = "org-nbib";
            _memoryCache.Remove(expectedOrgNoKey);
            _memoryCache.Remove(expectedOrgNameKey);

            HttpClient httpClient = GetTestHttpClient();
            OrganisationRepository orgRepo = new OrganisationRepository(httpClient, _memoryCache, _loggerMock.Object, _optionsMock.Object);

            // Act
            Organisation actual = await orgRepo.GetOrganisationByOrgNumber("976029100");

            // Assert
            Assert.NotNull(actual);
            Assert.True(_memoryCache.TryGetValue(expectedOrgNoKey, out _));
            Assert.True(_memoryCache.TryGetValue(expectedOrgNameKey, out _));
        }

        private HttpClient GetTestHttpClient()
        {
            Dictionary<string, Organisation> organisations = new Dictionary<string, Organisation>
            {
                ["dibk"] = new Organisation { Org = "dibk", OrgNumber = "974760223" },
                ["nbib"] = new Organisation
                {
                    Org = "nbib",
                    OrgNumber = "976029100",
                    Name = new Dictionary<string, string>
                    {
                        ["en"] = "National Library of Norway",
                        ["nb"] = "Nasjonalbiblioteket"
                    }
                },
                ["brg"] = new Organisation { Org = "brg", OrgNumber = "974760673" }
            };

            HttpResponseMessage orgsResponseMessage = new HttpResponseMessage
            {
                StatusCode = System.Net.HttpStatusCode.OK,
                Content = new StringContent($"{{\"orgs\": {JsonConvert.SerializeObject(organisations)} }}", Encoding.UTF8, "application/json")
            };

            Mock<HttpMessageHandler> handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);

            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.Is<HttpRequestMessage>(p => p.RequestUri.ToString().Contains("altinn-orgs")),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(orgsResponseMessage)
                .Verifiable();

            return new HttpClient(handlerMock.Object);
        }
    }
}
