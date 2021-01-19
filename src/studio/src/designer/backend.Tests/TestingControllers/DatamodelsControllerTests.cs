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

namespace Designer.Tests.TestingControllers
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
        public async void Get_Datamodel_Ok()
        {
            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?filepath=5245/41111/41111";
   
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData)
            {
            };

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responsestring = await response.Content.ReadAsStringAsync();
            TextReader textReader = new StringReader(responsestring);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);

            new JsonSerializer().Deserialize<JsonSchema>(jsonValue);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async void Get_Datamodel_onlyXsd_Ok()
        {
            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?filepath=4106/35721/35721";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData)
            {
            };

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responsestring = await response.Content.ReadAsStringAsync();
            TextReader textReader = new StringReader(responsestring);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            JsonSchema jsonSchema = new Manatee.Json.Serialization.JsonSerializer().Deserialize<JsonSchema>(jsonValue);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(5, jsonSchema.Count);
        }

        /// <summary>
        /// Scenario: Post a Json Schema
        /// </summary>
        [Fact]
        public async void Get_Put_Updatemodel_Ok()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DatamodelsControllerTests).Assembly.CodeBase).LocalPath);
            unitTestFolder = Path.Combine(unitTestFolder, @"..\..\..\_TestData\");
            if (File.Exists(unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/3478/32578/32578.schema.json"))
            {
                File.Delete(unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/3478/32578/32578.schema.json");
            }
  
            File.Copy(unitTestFolder + "Model/Xsd/schema_2978_1_forms_3478_32578.xsd", unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/3478/32578/32578.xsd", true);
  
            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?filepath=3478/32578/32578";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData)
            {
            };

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responsestring = await response.Content.ReadAsStringAsync();
            TextReader textReader = new StringReader(responsestring);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            JsonSchema jsonSchema = new Manatee.Json.Serialization.JsonSerializer().Deserialize<JsonSchema>(jsonValue);

            dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/UpdateDatamodel?filepath=3478/32578/32578";

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
        public async void Get_Put_Updatemodel2_Ok()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DatamodelsControllerTests).Assembly.CodeBase).LocalPath);
            unitTestFolder = Path.Combine(unitTestFolder, @"..\..\..\_TestData\");
            if (File.Exists(unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/5245/41111/41111.schema.json"))
            {
                File.Delete(unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/5245/41111/41111.schema.json");
            }

            File.Copy(unitTestFolder + "Model/Xsd/schema_4581_100_forms_5245_41111.xsd", unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/5245/41111/41111.xsd", true);

            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?filepath=5245/41111/41111";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData)
            {
            };

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responsestring = await response.Content.ReadAsStringAsync();
            TextReader textReader = new StringReader(responsestring);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            JsonSchema jsonSchema = new Manatee.Json.Serialization.JsonSerializer().Deserialize<JsonSchema>(jsonValue);

            dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/UpdateDatamodel?filepath=5245/41111/41111";

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
        public async void Get_Put_Updatemodel3_Ok()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DatamodelsControllerTests).Assembly.CodeBase).LocalPath);
            unitTestFolder = Path.Combine(unitTestFolder, @"..\..\..\_TestData\");
            if (File.Exists(unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/ra/0678/0678.schema.json"))
            {
                File.Delete(unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/ra/0678/0678.schema.json");
            }

            File.Copy(unitTestFolder + "Model/Xsd/RA-0678_M.xsd", unitTestFolder + "Repositories/testuser/ttd/ttd-datamodels/ra/0678/0678.xsd", true);

            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?filepath=ra/0678/0678";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData)
            {
            };

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responsestring = await response.Content.ReadAsStringAsync();
            TextReader textReader = new StringReader(responsestring);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            JsonSchema jsonSchema = new Manatee.Json.Serialization.JsonSerializer().Deserialize<JsonSchema>(jsonValue);

            dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/UpdateDatamodel?filepath=ra/0678/0678";

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

        private HttpClient GetTestClient()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DatamodelsControllerTests).Assembly.CodeBase).LocalPath);

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

                builder.ConfigureTestServices(services =>
                {
                    services.Configure<ServiceRepositorySettings>(serviceRepositorySettingSection);
                    services.AddSingleton<IGitea, IGiteaMock>();
                });
            }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
            return client;
        }

        private JsonSchema LoadTestData(string resourceName)
        {
            Assembly assembly = typeof(DatamodelsControllerTests).GetTypeInfo().Assembly;
            using Stream resource = assembly.GetManifestResourceStream(resourceName);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data embedded in the test assembly.");
            }

            using StreamReader streamReader = new StreamReader(resource);
            JsonValue jsonValue = JsonValue.Parse(streamReader);
            return new JsonSerializer().Deserialize<JsonSchema>(jsonValue);
        }
    }
}
