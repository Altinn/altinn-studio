using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers
{
    public class RepositorySettingsControllerTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;

        public RepositorySettingsControllerTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task Get_RepositorySettings_ShouldReturnOk()
        {
            var org = "ttd";
            var sourceRepository = "xyz-datamodels";
            var developer = "testUser";
            var targetRepository = $"{Guid.NewGuid()}-datamodels";
            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);

            var httpClient = GetTestClient();
            string requestUrl = $"/designer/api/v1/{org}/{targetRepository}/repositorysettings";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUrl);
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(httpClient, httpRequestMessage);

            try
            {
                HttpResponseMessage response = await httpClient.SendAsync(httpRequestMessage);
                var altinnStudioSettings = await response.Content.ReadAsAsync<AltinnStudioSettings>();

                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                Assert.Equal(DatamodellingPreference.JsonSchema, altinnStudioSettings.DatamodellingPreference);
                Assert.Equal(AltinnRepositoryType.Datamodels, altinnStudioSettings.RepoType);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task Get_RepositoryDoesNotExists_ShouldReturnNotFound()
        {
            var org = "ttd";
            var targetRepository = $"thisDoesNotExist-datamodels";

            var httpClient = GetTestClient();
            string requestUrl = $"/designer/api/v1/{org}/{targetRepository}/repositorysettings";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUrl);
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(httpClient, httpRequestMessage);

            HttpResponseMessage response = await httpClient.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Put_ValidRepositorySettings_ShouldUpdate()
        {
            var org = "ttd";
            var sourceRepository = "xyz-datamodels";
            var developer = "testUser";
            var targetRepository = $"{Guid.NewGuid()}-datamodels";
            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);

            var httpClient = GetTestClient();
            string requestUrl = $"/designer/api/v1/{org}/{targetRepository}/repositorysettings";
            var requestBody = @"{""repoType"": ""Datamodels"", ""datamodellingPreference"": ""JsonSchema""}";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUrl)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(httpClient, httpRequestMessage);

            try
            {
                HttpResponseMessage response = await httpClient.SendAsync(httpRequestMessage);
                var altinnStudioSettings = await response.Content.ReadAsAsync<AltinnStudioSettings>();

                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                Assert.Equal(DatamodellingPreference.JsonSchema, altinnStudioSettings.DatamodellingPreference);
                Assert.Equal(AltinnRepositoryType.Datamodels, altinnStudioSettings.RepoType);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        private HttpClient GetTestClient()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DatamodelsControllerTests).Assembly.Location).LocalPath);

            Program.ConfigureSetupLogging();

            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureAppConfiguration((context, conf) =>
                {
                    conf.AddJsonFile("appsettings.json");
                });

                var configuration = new ConfigurationBuilder()
                    .AddJsonFile("appsettings.json")
                    .Build();

                configuration.GetSection("ServiceRepositorySettings:RepositoryLocation").Value = Path.Combine(unitTestFolder, @"..\..\..\_TestData\Repositories\");

                IConfigurationSection serviceRepositorySettingSection = configuration.GetSection("ServiceRepositorySettings");

                Mock<IRepository> repositoryMock = new Mock<IRepository>() { CallBase = true, };
                repositoryMock
                    .Setup(r => r.UpdateApplicationWithAppLogicModel(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                    .Verifiable();

                repositoryMock.
                    Setup(r => r.ReadData(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).
                    Returns<string, string, string>(async (org, repo, path) =>
                    {
                        string repopath = Path.Combine(unitTestFolder, @"..\..\..\_TestData\Repositories\");
                        repopath += @$"testUser\{org}\{repo}\";

                        Stream fs = File.OpenRead(repopath + path);
                        return await Task.FromResult(fs);
                    });
                repositoryMock.Setup(r => r.DeleteData(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Verifiable();
                repositoryMock.Setup(r => r.WriteData(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Stream>())).Verifiable();
                repositoryMock.Setup(r => r.DeleteMetadataForAttachment(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Returns(true);
                builder.ConfigureTestServices(services =>
                {
                    services.Configure<ServiceRepositorySettings>(serviceRepositorySettingSection);
                    services.AddSingleton<IGitea, IGiteaMock>();

                    services.AddSingleton(repositoryMock.Object);
                });
            }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
            return client;
        }
    }
}
