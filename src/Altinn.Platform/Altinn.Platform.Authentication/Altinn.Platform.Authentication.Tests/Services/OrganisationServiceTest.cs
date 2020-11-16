using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;
using Moq.Protected;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.Platform.Authentication.Tests.Services
{
    /// <summary>
    /// Testclass for harvesting orgs.
    /// </summary>
    public class OrganisationServiceTest
    {
        private readonly IMemoryCache _memoryCache;
        private readonly Mock<ILogger<OrganisationsService>> _loggerMock;
        private readonly Mock<IOptions<GeneralSettings>> _generalSettingsMock;

        public OrganisationServiceTest()
        {
            GeneralSettings generalSettings = new GeneralSettings { OrganisationRepositoryLocation = "https://mock.com/altinn-orgs.json" };
            _generalSettingsMock = new Mock<IOptions<GeneralSettings>>();
            _generalSettingsMock.Setup(o => o.Value).Returns(generalSettings);
            _loggerMock = new Mock<ILogger<OrganisationsService>>();
            _memoryCache = new MemoryCache(new MemoryCacheOptions());
        }

        /// <summary>
        /// Tests harvest orgs.
        /// </summary>
        [Fact]
        public async Task LookupOrg_NoCache_CacheSuccessfullyPopulated()
        {
            // Arrange
            string expectedOrgNoKey = "974760223";

            HttpClient httpClient = GetTestHttpClient();
            OrganisationsService orgService = new OrganisationsService(httpClient, _memoryCache, _loggerMock.Object, _generalSettingsMock.Object);

            // Act 
            string org = await orgService.LookupOrg("974760223");
            _memoryCache.TryGetValue("organisationDictionary", out Dictionary<string, Organisation> actualCachedDictionary);

            // Assert
            Assert.Equal("dibk", org);
            Assert.NotNull(actualCachedDictionary);
            Assert.True(actualCachedDictionary.TryGetValue(expectedOrgNoKey, out _));
        }

        [Fact]
        public async Task GetOrganisationByOrg_OrgReturnedFromCache()
        {
            // Arrange
            string cacheKey = "organisationDictionary";
            Dictionary<string, Organisation> organisationDictionary = new Dictionary<string, Organisation>
            {
                ["976029100"] = new Organisation
                {
                    Org = "nbib",
                    OrgNumber = "976029100",
                    Name = new Dictionary<string, string>
                    {
                        ["en"] = "National Library of Norway",
                        ["nb"] = "Nasjonalbiblioteket"
                    }
                }
            };

            _memoryCache.Set(cacheKey, organisationDictionary);
            _generalSettingsMock.Setup(o => o.Value).Returns(new GeneralSettings { OrganisationRepositoryLocation = "https://mock.com/altinn-orgs.json" });

            OrganisationsService orgService = new OrganisationsService(null, _memoryCache, _loggerMock.Object, _generalSettingsMock.Object);

            // Act
            string orgName = await orgService.LookupOrg("976029100");

            // Assert
            Assert.Equal("nbib", orgName);
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
