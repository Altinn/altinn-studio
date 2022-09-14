using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;

using Designer.Tests.Mocks;
using Designer.Tests.Utils;

using LibGit2Sharp;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using Xunit.Sdk;

using IRepository = Altinn.Studio.Designer.Services.Interfaces.IRepository;

namespace Designer.Tests.Controllers
{
    public class TextsControllerTests : IClassFixture<WebApplicationFactory<TextsController>>
    {
        private readonly WebApplicationFactory<TextsController> _factory;
        private readonly string _versionPrefix = "designer/api/v2";

        public TextsControllerTests(WebApplicationFactory<TextsController> factory)
        {
            _factory = factory;
            TestSetupUtils.SetupDirtyHackIfLinux();
        }

        [Fact]
        public async Task Get_ReturnsNbTexts()
        {
            HttpClient client = GetTestClient();
            string dataPathWithData = $"{_versionPrefix}/ttd/new-texts-format/texts/nb";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Dictionary<string, string> responseDictionary = JsonSerializer.Deserialize<Dictionary<string, string>>(responseDocument.RootElement.ToString());

            Dictionary<string, string> expectedDictionary = new Dictionary<string, string> { { "nb_key1", "nb_value1" }, { "nb_key2", "nb_value2" } };
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal(expectedDictionary, responseDictionary);
        }

        [Fact]
        public async Task Get_NonExistingFile_404NotFound()
        {
            HttpClient client = GetTestClient();
            string dataPathWithData = $"{_versionPrefix}/ttd/new-texts-format/texts/uk";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);

            Assert.Equal(StatusCodes.Status404NotFound, (int)response.StatusCode);
            Assert.Equal("The texts file, uk.texts.json, that you are trying to find does not exist.", responseDocument.RootElement.ToString());
        }

        [Fact]
        public async Task Get_InvalidFile_500InternalServer()
        {
            HttpClient client = GetTestClient();
            string dataPathWithData = $"{_versionPrefix}/ttd/invalid-texts-format/texts/en";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Dictionary<string, string> responseDictionary = JsonSerializer.Deserialize<Dictionary<string, string>>(responseDocument.RootElement.ToString());

            Assert.Equal(StatusCodes.Status500InternalServerError, (int)response.StatusCode);
            Assert.Equal("The format of the file, en.texts.json, that you tried to access might be invalid.", responseDictionary["errorMessage"]);
        }

        [Fact]
        public async Task Put_UpdateNbTexts_204NoContent()
        {
            var targetRepository = Guid.NewGuid().ToString();
            await TestDataHelper.CopyRepositoryForTest("ttd", "new-texts-format", "testUser", targetRepository);
            HttpClient client = GetTestClient();
            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/texts/nb";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);
            httpRequestMessage.Content = JsonContent.Create(new { new_key_1 = "new_value_1", new_key_2 = "new_value_2" });
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            try
            {
                Assert.Equal(StatusCodes.Status204NoContent, (int)response.StatusCode);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }

        [Fact]
        public async Task Put_UpdateInvalidFormat_400BadRequest()
        {
            var targetRepository = Guid.NewGuid().ToString();
            await TestDataHelper.CopyRepositoryForTest("ttd", "new-texts-format", "testUser", targetRepository);
            HttpClient client = GetTestClient();
            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/texts/nb";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);
            httpRequestMessage.Content = JsonContent.Create(new { valid_key = "valid_value", invalid_key = new { invalid_format = "invalid_format" } });
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);

            try
            {
                Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
                Assert.Equal("The texts file, nb.texts.json, that you are trying to add have invalid format.", responseDocument.RootElement.ToString());
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }

        [Fact]
        public async Task Delete_200Ok()
        {
            var targetRepository = Guid.NewGuid().ToString();
            await TestDataHelper.CopyRepositoryForTest("ttd", "new-texts-format", "testUser", targetRepository);
            HttpClient client = GetTestClient();
            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/texts/nb";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, dataPathWithData);
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);

            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
                Assert.Equal("Texts file, nb.texts.json, was successfully deleted.", responseDocument.RootElement.ToString());
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }

        private HttpClient GetTestClient()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DatamodelsControllerTests).Assembly.Location).LocalPath);
            string projectDir = Directory.GetCurrentDirectory();
            string configPath = Path.Combine(projectDir, "appsettings.json");

            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureAppConfiguration((context, conf) =>
                {
                    conf.AddJsonFile(configPath);
                });

                var configuration = new ConfigurationBuilder()
                    .AddJsonFile(configPath)
                    .Build();

                configuration.GetSection("ServiceRepositorySettings:RepositoryLocation").Value = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "Repositories");

                IConfigurationSection serviceRepositorySettingSection = configuration.GetSection("ServiceRepositorySettings");

                Mock<IRepository> repositoryMock = new Mock<IRepository>() { CallBase = true, };
                repositoryMock
                    .Setup(r => r.UpdateApplicationWithAppLogicModel(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                    .Verifiable();

                repositoryMock.
                    Setup(r => r.ReadData(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).
                    Returns<string, string, string>(async (org, repo, path) =>
                    {
                        string repopath = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "Repositories", "testUser", org, repo, path);

                        Stream fs = File.OpenRead(repopath);
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
