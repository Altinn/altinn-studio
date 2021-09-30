using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.App.Api.Models;
using Altinn.App.IntegrationTests;
using Altinn.Platform.Storage.Interface.Models;

using App.IntegrationTests.Utils;

using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class DataTagsApiTests : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private const string Org = "tdd";
        private const string App = "endring-av-navn";
        private const string InstanceGuid = "9bca707e-466d-4565-9497-317f379d046e";

        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public DataTagsApiTests(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task GetAllTags_DataElementHasNoTags_ReturnEmptyList()
        {
            // Arrange
            string dataGuid = "aa674171-3565-42aa-8f48-995b202cac41";

            HttpClient client = GetClient();

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
                HttpMethod.Get,
                $"/tdd/endring-av-navn/instances/1337/{InstanceGuid}/data/{dataGuid}/tags");

            // Act
            TestDataUtil.PrepareDataElement(Org, App, 1337, new Guid(InstanceGuid), new Guid(dataGuid));
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteDataElement(Org, App, 1337, new Guid(InstanceGuid), new Guid(dataGuid));

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responsBody = await response.Content.ReadAsStringAsync();
            TagsList tagsList = JsonSerializer.Deserialize<TagsList>(responsBody);

            Assert.NotNull(tagsList);
            Assert.Empty(tagsList.Tags);
        }

        [Fact]
        public async Task GetAllTags_DataElementHasTwoTags_ReturnTwoTags()
        {
            // Arrange
            string dataGuid = Guid.NewGuid().ToString();

            HttpClient client = GetClient();

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
                HttpMethod.Get,
                $"/tdd/endring-av-navn/instances/1337/{InstanceGuid}/data/{dataGuid}/tags");

            DataElement dataElement = CreateDataElement(dataGuid, new List<string> { "cat", "lion" });

            // Act
            TestDataUtil.AddDataElement(Org, App, 1337, new Guid(InstanceGuid), dataElement);
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteDataElement(Org, App, 1337, new Guid(InstanceGuid), new Guid(dataGuid));

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responsBody = await response.Content.ReadAsStringAsync();
            TagsList tagsList = JsonSerializer.Deserialize<TagsList>(responsBody);

            Assert.NotNull(tagsList);
            Assert.Equal(dataElement.Tags.Count, tagsList.Tags.Count);
        }

        [Theory]
        [InlineData("feline")]
        [InlineData("liôon-cûb")]
        [InlineData("Åååå_ææ")]
        public async Task AddTag_DataElementHasOneTag_ReturnTwoTags(string tagName)
        {
            // Arrange
            string dataGuid = Guid.NewGuid().ToString();

            HttpClient client = GetClient();

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
                HttpMethod.Post,
                $"/tdd/endring-av-navn/instances/1337/{InstanceGuid}/data/{dataGuid}/tags");
            httpRequestMessage.Content = JsonContent.Create(tagName);

            DataElement dataElement = CreateDataElement(dataGuid, new List<string> { "cat", "lion" });

            // Act
            TestDataUtil.AddDataElement(Org, App, 1337, new Guid(InstanceGuid), dataElement);
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteDataElement(Org, App, 1337, new Guid(InstanceGuid), new Guid(dataGuid));

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responsBody = await response.Content.ReadAsStringAsync();
            TagsList tagsList = JsonSerializer.Deserialize<TagsList>(responsBody);

            Assert.NotNull(tagsList);
            Assert.Equal(dataElement.Tags.Count + 1, tagsList.Tags.Count);
            Assert.Contains(tagName, tagsList.Tags);
        }

        [Theory]
        [InlineData("")]
        [InlineData(" ")]
        [InlineData("<img/>")]
        [InlineData("&amp;")]
        public async Task AddTag_NewTagHasInvalidCharacters_ReturnBadRequest(string tagName)
        {
            // Arrange
            string dataGuid = Guid.NewGuid().ToString();

            HttpClient client = GetClient();

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
                HttpMethod.Post,
                $"/tdd/endring-av-navn/instances/1337/{InstanceGuid}/data/{dataGuid}/tags");
            httpRequestMessage.Content = JsonContent.Create(tagName);

            DataElement dataElement = CreateDataElement(dataGuid, new List<string> { "cat", "lion" });

            // Act
            TestDataUtil.AddDataElement(Org, App, 1337, new Guid(InstanceGuid), dataElement);
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteDataElement(Org, App, 1337, new Guid(InstanceGuid), new Guid(dataGuid));

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task DeleteTag_DataElementHasTwoTags_ReturnNoContent()
        {
            // Arrange
            string dataGuid = Guid.NewGuid().ToString();

            string tagName = "lion";

            HttpClient client = GetClient();

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
                HttpMethod.Delete,
                $"/tdd/endring-av-navn/instances/1337/{InstanceGuid}/data/{dataGuid}/tags/{tagName}");

            DataElement dataElement = CreateDataElement(dataGuid, new List<string> { "cat", "lion" });

            // Act
            TestDataUtil.AddDataElement(Org, App, 1337, new Guid(InstanceGuid), dataElement);
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteDataElement(Org, App, 1337, new Guid(InstanceGuid), new Guid(dataGuid));

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        private HttpClient GetClient()
        {
            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, Org, App);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        private static DataElement CreateDataElement(string dataId, List<string> tags)
        {
            return new DataElement
            {
                Id = dataId,
                DataType = "default",
                Size = 0,
                Locked = false,
                Tags = tags
            };
        }
    }
}
