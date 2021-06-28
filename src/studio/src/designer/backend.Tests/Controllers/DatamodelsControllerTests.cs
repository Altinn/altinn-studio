using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

using Designer.Tests.Mocks;
using Designer.Tests.Utils;

using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers
{
    public class DatamodelsControllerTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;
        private readonly string _versionPrefix = "/designer/api";

        public DatamodelsControllerTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task Get_Datamodel_Ok()
        {
            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?modelName=41111";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responsestring = await response.Content.ReadAsStringAsync();
            TextReader textReader = new StringReader(responsestring);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);

            new JsonSerializer().Deserialize<JsonSchema>(jsonValue);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task GetDatamodel_InvalidFilePath_ReturnsBadRequest()
        {
            // Arrange
            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?modelName=../App/models/41111";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responsestring = await response.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal("Invalid model name value.", responsestring);
        }

        [Fact]
        public async Task Get_Datamodel_onlyXsd_Ok()
        {
            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?modelName=35721";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responsestring = await response.Content.ReadAsStringAsync();
            TextReader textReader = new StringReader(responsestring);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            JsonSchema jsonSchema = new JsonSerializer().Deserialize<JsonSchema>(jsonValue);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(5, jsonSchema.Count);
        }

        /// <summary>
        /// Scenario: Post a Json Schema
        /// </summary>
        [Fact]
        public async Task Get_Put_Updatemodel_Ok()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DatamodelsControllerTests).Assembly.Location).LocalPath);
            unitTestFolder = Path.Combine(unitTestFolder, @"..\..\..\_TestData\");
            if (File.Exists(unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/App/models/32578.schema.json"))
            {
                File.Delete(unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/App/models/32578.schema.json");
            }

            File.Copy(unitTestFolder + "Model/Xsd/schema_2978_1_forms_3478_32578.xsd", unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/App/models/32578.xsd", true);

            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?modelName=32578";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responsestring = await response.Content.ReadAsStringAsync();
            TextReader textReader = new StringReader(responsestring);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            JsonSchema jsonSchema = new JsonSerializer().Deserialize<JsonSchema>(jsonValue);

            dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/UpdateDatamodel?modelName=32578";

            var serializer = new JsonSerializer();
            JsonValue toar = serializer.Serialize(jsonSchema);

            string requestBody = toar.ToString();
            HttpRequestMessage httpRequestMessagePut = new HttpRequestMessage(HttpMethod.Put, dataPathWithData)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessagePut);
            HttpResponseMessage responsePut = await client.SendAsync(httpRequestMessagePut);
            Assert.Equal(HttpStatusCode.OK, responsePut.StatusCode);
        }

        /// <summary>
        /// Scenario: Post a Json Schema
        /// </summary>
        [Fact]
        public async Task Get_Put_Updatemodel2_Ok()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DatamodelsControllerTests).Assembly.Location).LocalPath);
            unitTestFolder = Path.Combine(unitTestFolder, @"..\..\..\_TestData\");
            if (File.Exists(unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/App/models/41111.schema.json"))
            {
                File.Delete(unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/App/models/41111.schema.json");
            }

            File.Copy(unitTestFolder + "Model/Xsd/schema_4581_100_forms_5245_41111.xsd", unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/App/models/41111.xsd", true);

            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?modelName=41111";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responsestring = await response.Content.ReadAsStringAsync();
            TextReader textReader = new StringReader(responsestring);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            JsonSchema jsonSchema = new JsonSerializer().Deserialize<JsonSchema>(jsonValue);

            dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/UpdateDatamodel?modelName=41111";

            var serializer = new JsonSerializer();
            JsonValue toar = serializer.Serialize(jsonSchema);

            string requestBody = toar.ToString();
            HttpRequestMessage httpRequestMessagePut = new HttpRequestMessage(HttpMethod.Put, dataPathWithData)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessagePut);
            HttpResponseMessage responsePut = await client.SendAsync(httpRequestMessagePut);
            Assert.Equal(HttpStatusCode.OK, responsePut.StatusCode);
        }

        /// <summary>
        /// Scenario: Post a Json Schema
        /// </summary>
        [Fact]
        public async Task Get_Put_Updatemodel3_Ok()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DatamodelsControllerTests).Assembly.Location).LocalPath);
            unitTestFolder = Path.Combine(unitTestFolder, @"..\..\..\_TestData\");
            if (File.Exists(unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/App/models/0678.schema.json"))
            {
                File.Delete(unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/App/models/0678.schema.json");
            }

            File.Copy(unitTestFolder + "Model/Xsd/RA-0678_M.xsd", unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/App/models/0678.xsd", true);

            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?modelName=0678";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responsestring = await response.Content.ReadAsStringAsync();
            TextReader textReader = new StringReader(responsestring);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            JsonSchema jsonSchema = new JsonSerializer().Deserialize<JsonSchema>(jsonValue);

            dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/UpdateDatamodel?modelName=0678";

            var serializer = new JsonSerializer();
            JsonValue toar = serializer.Serialize(jsonSchema);

            string requestBody = toar.ToString();
            HttpRequestMessage httpRequestMessagePut = new HttpRequestMessage(HttpMethod.Put, dataPathWithData)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessagePut);
            HttpResponseMessage responsePut = await client.SendAsync(httpRequestMessagePut);
            Assert.Equal(HttpStatusCode.OK, responsePut.StatusCode);
        }

        /// <summary>
        /// Scenario: Attempt to update a JSON Schema to an invalid path.
        /// </summary>
        [Fact]
        public async Task UpdateDatamodel_FilePathIsInvalid_ReturnsBadRequest()
        {
            // Arrange
            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?modelName=0678";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responsestring = await response.Content.ReadAsStringAsync();
            TextReader textReader = new StringReader(responsestring);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            JsonSchema jsonSchema = new JsonSerializer().Deserialize<JsonSchema>(jsonValue);

            dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/UpdateDatamodel?modelName=../../0678";

            var serializer = new JsonSerializer();
            JsonValue toar = serializer.Serialize(jsonSchema);

            string requestBody = toar.ToString();
            HttpRequestMessage httpRequestMessagePut = new HttpRequestMessage(HttpMethod.Put, dataPathWithData)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessagePut);

            // Act
            HttpResponseMessage responsePut = await client.SendAsync(httpRequestMessagePut);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, responsePut.StatusCode);
            string responsestringPut = await responsePut.Content.ReadAsStringAsync();
            Assert.Equal("Invalid model name value.", responsestringPut);
        }

        [Fact]
        public async Task Delete_Datamodel_Ok()
        {
            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/DeleteDatamodel?modelName=41111";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, dataPathWithData);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task GetDatamodels_NoInput_ShouldReturnAllModels()
        {
            var client = GetTestClient();
            var url = $"{_versionPrefix}/ttd/hvem-er-hvem/Datamodels/";

            var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);            

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            var response = await client.SendAsync(httpRequestMessage);
            var json = await response.Content.ReadAsStringAsync();
            var altinnCoreFiles = System.Text.Json.JsonSerializer.Deserialize<List<AltinnCoreFile>>(json);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(8, altinnCoreFiles.Count);
        }

        [Fact]
        public async Task GetDatamodels_NotAuthenticated_ShouldReturn401()
        {
            var client = GetTestClient();
            var url = $"{_versionPrefix}/ttd/hvem-er-hvem/Datamodels/";
            var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);
            
            var response = await client.SendAsync(httpRequestMessage);
            
            Assert.Equal(HttpStatusCode.Found, response.StatusCode);
            Assert.Contains("/login/", response.Headers.Location.AbsoluteUri.ToLower());
        }

        [Theory]
        [InlineData("testModel.schema.json")]
        [InlineData("App/testModel.schema.json")]
        [InlineData("App/models/testModel.schema.json")]
        [InlineData("/App/models/testModel.schema.json")]
        public async Task PutDatamodel_ValidInput_ShouldUpdateFile(string modelPath)
        {
            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory("ttd", "hvem-er-hvem", "testUser");
            var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(repositoriesRootDirectory, repositoryDirectory);

            if (gitRepository.FileExistsByRelativePath(modelPath))
            {
                gitRepository.DeleteFileByRelativePath(modelPath);
            }

            var client = GetTestClient();
            var url = $"{_versionPrefix}/ttd/hvem-er-hvem/Datamodels/?modelPath={modelPath}";
            string requestBody = "{}";
            var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            try
            {
                var response = await client.SendAsync(httpRequestMessage);

                Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            }
            finally
            {
                gitRepository.DeleteFileByRelativePath(modelPath);
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
