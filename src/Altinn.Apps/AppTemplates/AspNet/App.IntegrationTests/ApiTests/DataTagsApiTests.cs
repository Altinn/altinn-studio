using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.App.Api.Models;
using Altinn.App.IntegrationTests;

using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;

using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class DataTagsApiTests : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public DataTagsApiTests(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task GetAllTags_DataElementHasNoTags_ReturnEmptyList()
        {
            // Arrange
            string instanceGuid = "9bca707e-466d-4565-9497-317f379d046e";
            string dataGuid = "aa674171-3565-42aa-8f48-995b202cac41";

            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
                HttpMethod.Get,
                $"/tdd/endring-av-navn/instances/1337/{instanceGuid}/data/{dataGuid}/tags");

            // Act
            TestDataUtil.PrepareDataElement("tdd", "endring-av-navn", 1337, new Guid(instanceGuid), new Guid(dataGuid));
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteDataElement("tdd", "endring-av-navn", 1337, new Guid(instanceGuid), new Guid(dataGuid));

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
            string instanceGuid = "9bca707e-466d-4565-9497-317f379d046e";
            string dataGuid = "e854c52d-f0d1-4925-8b7c-eac928e81bef";

            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
                HttpMethod.Get,
                $"/tdd/endring-av-navn/instances/1337/{instanceGuid}/data/{dataGuid}/tags");

            // Act
            TestDataUtil.PrepareDataElement("tdd", "endring-av-navn", 1337, new Guid(instanceGuid), new Guid(dataGuid));
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteDataElement("tdd", "endring-av-navn", 1337, new Guid(instanceGuid), new Guid(dataGuid));

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responsBody = await response.Content.ReadAsStringAsync();
            TagsList tagsList = JsonSerializer.Deserialize<TagsList>(responsBody);

            Assert.NotNull(tagsList);
            Assert.Equal(2, tagsList.Tags.Count);
        }

        [Fact]
        public async Task AddTag_DataElementHasOneTag_ReturnTwoTags()
        {
            // Arrange
            string instanceGuid = "9bca707e-466d-4565-9497-317f379d046e";
            string dataGuid = "29d67ed2-cfdc-47c1-8d0c-eb152c014c75";

            string tagName = "feline";

            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
                HttpMethod.Post,
                $"/tdd/endring-av-navn/instances/1337/{instanceGuid}/data/{dataGuid}/tags");
            httpRequestMessage.Content = JsonContent.Create(tagName);

            // Act
            TestDataUtil.PrepareDataElement("tdd", "endring-av-navn", 1337, new Guid(instanceGuid), new Guid(dataGuid));
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteDataElement("tdd", "endring-av-navn", 1337, new Guid(instanceGuid), new Guid(dataGuid));

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responsBody = await response.Content.ReadAsStringAsync();
            TagsList tagsList = JsonSerializer.Deserialize<TagsList>(responsBody);

            Assert.NotNull(tagsList);
            Assert.Equal(2, tagsList.Tags.Count);
            Assert.Contains(tagName, tagsList.Tags);
        }

        [Fact]
        public async Task DeleteTag_DataElementHasTwoTags_ReturnOneTag()
        {
            // Arrange
            string instanceGuid = "9bca707e-466d-4565-9497-317f379d046e";
            string dataGuid = "5c0d66ef-d732-415d-9571-0fb7c98e7022";

            string tagName = "lion";

            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
                HttpMethod.Delete,
                $"/tdd/endring-av-navn/instances/1337/{instanceGuid}/data/{dataGuid}/tags/{tagName}");

            // Act
            TestDataUtil.PrepareDataElement("tdd", "endring-av-navn", 1337, new Guid(instanceGuid), new Guid(dataGuid));
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteDataElement("tdd", "endring-av-navn", 1337, new Guid(instanceGuid), new Guid(dataGuid));

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }
    }
}
