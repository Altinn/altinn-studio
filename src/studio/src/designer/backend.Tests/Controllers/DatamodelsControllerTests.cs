using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.ViewModels.Request;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using FluentAssertions;
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
            Assert.Equal(7, altinnCoreFiles.Count);
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
        [InlineData("App/models/HvemErHvem_SERES.schema.json")]
        [InlineData("App/models/hvemerhvem_seres.schema.json")]
        [InlineData("App%2Fmodels%2FHvemErHvem_SERES.schema.json")]
        public async Task GetDatamodel_ValidPath_ShouldReturnContent(string modelPath)
        {
            var org = "ttd";
            var repository = "hvem-er-hvem";

            var client = GetTestClient();
            var url = $"{_versionPrefix}/{org}/{repository}/datamodels/{modelPath}";

            var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            var response = await client.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Theory]
        [InlineData("testModel.schema.json")]
        [InlineData("App/testModel.schema.json")]
        [InlineData("App/models/testModel.schema.json")]
        [InlineData("/App/models/testModel.schema.json")]
        [InlineData("App%2Fmodels%2FtestModel.schema.json")]
        public async Task PutDatamodel_ValidInput_ShouldUpdateFile(string modelPath)
        {
            var org = "ttd";
            var sourceRepository = "hvem-er-hvem";
            var developer = "testUser";
            var targetRepository = Guid.NewGuid().ToString();

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);

            var client = GetTestClient();
            var url = $"{_versionPrefix}/{org}/{targetRepository}/Datamodels/?modelPath={modelPath}";
            var minimumValidJsonSchema = @"{""properties"":{""root"":{""$ref"":""#/definitions/rootType""}},""definitions"":{""rootType"":{""properties"":{""keyword"":{""type"":""string""}}}}}";
            string requestBody = minimumValidJsonSchema;
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
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task PostDatamodel_FromXsd_ShouldReturnCreated()
        {
            // Arrange
            var org = "ttd";
            var sourceRepository = "empty-datamodels";
            var developer = "testUser";
            var targetRepository = Guid.NewGuid().ToString();

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            var client = GetTestClient();
            var url = $"{_versionPrefix}/{org}/{targetRepository}/Datamodels";

            var fileStream = TestDataHelper.LoadDataFromEmbeddedResource("Designer.Tests._TestData.Model.Xsd.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");
            var formData = new MultipartFormDataContent();
            var streamContent = new StreamContent(fileStream);
            streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("multipart/form-data");
            formData.Add(streamContent, "file", "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");

            var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = formData
            };

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            try
            {
                var response = await client.SendAsync(httpRequestMessage);
                Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Theory]
        [InlineData("ServiceA", true)]
        [InlineData("", false)]
        public async Task PostDatamodel_FromFormPost_ShouldReturnCreatedFromTemplate(string relativeDirectory, bool altinn2Compatible)
        {
            // Arrange
            var org = "ttd";
            var sourceRepository = "empty-app";
            var developer = "testUser";
            var targetRepository = Guid.NewGuid().ToString();

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            var client = GetTestClient();
            var url = $"{_versionPrefix}/{org}/{targetRepository}/Datamodels/Post";

            var createViewModel = new CreateModelViewModel() { ModelName = "test", RelativeDirectory = relativeDirectory, Altinn2Compatible = altinn2Compatible };
            var postRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(createViewModel, null, new System.Text.Json.JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase })
            };

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, postRequestMessage);

            // Act / Assert
            try
            {
                var postResponse = await client.SendAsync(postRequestMessage);
                Assert.Equal(HttpStatusCode.Created, postResponse.StatusCode);

                Assert.Equal("application/json", postResponse.Content.Headers.ContentType.MediaType);

                var postContent = await postResponse.Content.ReadAsStringAsync();
                Json.Schema.JsonSchema postJsonSchema = Json.Schema.JsonSchema.FromText(postContent);
                Assert.NotNull(postJsonSchema);

                // Try to read back the created schema to verify it's stored
                // at the location provided in the post response
                var location = postResponse.Headers.Location;
                var getRequestMessage = new HttpRequestMessage(HttpMethod.Get, location);
                var getResponse = await client.SendAsync(getRequestMessage);
                var getContent = await getResponse.Content.ReadAsStringAsync();
                var getJsonSchema = Json.Schema.JsonSchema.FromText(getContent);
                Assert.NotNull(getJsonSchema);
                Assert.Equal(postContent, getContent);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Theory]
        [InlineData("", "ServiceA", true)]
        [InlineData("test<", "", false)]
        [InlineData("test>", "", false)]
        [InlineData("test|", "", false)]
        [InlineData("test\"", "", false)]
        public async Task PostDatamodel_InvalidFormPost_ShouldReturnBadRequest(string modelName, string relativeDirectory, bool altinn2Compatible)
        {
            var client = GetTestClient();
            var url = $"{_versionPrefix}/xyz/dummyRepo/Datamodels/Post";

            var createViewModel = new CreateModelViewModel() { ModelName = modelName, RelativeDirectory = relativeDirectory, Altinn2Compatible = altinn2Compatible };
            var postRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(createViewModel, null, new System.Text.Json.JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase })
            };

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, postRequestMessage);

            var postResponse = await client.SendAsync(postRequestMessage);

            Assert.Equal(HttpStatusCode.BadRequest, postResponse.StatusCode);
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
