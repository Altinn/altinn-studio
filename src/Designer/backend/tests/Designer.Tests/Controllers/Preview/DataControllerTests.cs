#nullable disable
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Models.Preview;
using Designer.Tests.Controllers.PreviewController;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.Preview;

public class DataControllerTests(WebApplicationFactory<Program> factory) : PreviewControllerTestsBase<DataControllerTests>(factory), IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Post_ReturnsCreated()
    {
        Instance instance = await CreateInstance();
        string dataPathWithData = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/data";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        string responseBody = await response.Content.ReadAsStringAsync();
        DataElement dataElement = JsonSerializer.Deserialize<DataElement>(responseBody, JsonSerializerOptions);
        Assert.NotNull(dataElement.Id);
        Assert.Equal(instance.Id, dataElement.InstanceGuid);
    }

    [Fact]
    public async Task Get_ReturnsOk()
    {
        Instance instance = await CreateInstance();
        DataElement dataElement = await CreateDataElement(instance, "datamodel");

        string dataPath = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/data/{dataElement.Id}";
        using HttpRequestMessage httpRequestMessageGet = new(HttpMethod.Get, dataPath);
        using HttpResponseMessage responseGet = await HttpClient.SendAsync(httpRequestMessageGet);
        Assert.Equal(HttpStatusCode.OK, responseGet.StatusCode);
        string responseBodyGet = await responseGet.Content.ReadAsStringAsync();
        JsonNode dataItem = JsonSerializer.Deserialize<JsonNode>(responseBodyGet, JsonSerializerOptions);
        Assert.NotNull(dataItem);
    }

    [Fact]
    public async Task Patch_ReturnsOk()
    {
        Instance instance = await CreateInstance();
        DataElement dataElement = await CreateDataElement(instance, "datamodel");

        string dataPath = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/data/{dataElement.Id}";
        using HttpRequestMessage httpRequestMessagePatch = new(HttpMethod.Patch, dataPath);

        string patch = "{\"patch\":[{\"op\":\"add\",\"path\":\"/RegNo\",\"value\":\"asdf\"}],\"ignoredValidators\":[\"DataAnnotations\",\"Required\",\"Expression\"]}";
        httpRequestMessagePatch.Content = new StringContent(patch, System.Text.Encoding.UTF8, "application/json");
        using HttpResponseMessage responsePatch = await HttpClient.SendAsync(httpRequestMessagePatch);
        Assert.Equal(HttpStatusCode.OK, responsePatch.StatusCode);
        string responseBodyPatch = await responsePatch.Content.ReadAsStringAsync();
        JsonNode dataItem = JsonSerializer.Deserialize<JsonNode>(responseBodyPatch, JsonSerializerOptions);
        Assert.NotNull(dataItem);
        Assert.Equal("asdf", dataItem["newDataModel"]["RegNo"].ToString());
    }

    [Fact]
    public async Task PatchMultiple_ReturnsOk()
    {
        Instance instance = await CreateInstance();
        DataElement dataElement1 = await CreateDataElement(instance, "datamodel");
        DataElement dataElement2 = await CreateDataElement(instance, "datamodel");
        string dataPath = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/data";
        using HttpRequestMessage httpRequestMessagePatchMultiple = new(HttpMethod.Patch, dataPath);

        string patches = "{\"patches\":[{\"dataElementId\":\"" + dataElement1.Id + "\",\"patch\":[{\"op\":\"add\",\"path\":\"/RegNo\",\"value\":\"dataobj1\"}]},{\"dataElementId\":\"" + dataElement2.Id + "\",\"patch\":[{\"op\":\"add\",\"path\":\"/RegNo\",\"value\":\"dataobj2\"}]}],\"ignoredValidators\":[\"DataAnnotations\",\"Required\",\"Expression\"]}";
        httpRequestMessagePatchMultiple.Content = new StringContent(patches, System.Text.Encoding.UTF8, "application/json");
        using HttpResponseMessage responsePatchMultiple = await HttpClient.SendAsync(httpRequestMessagePatchMultiple);
        Assert.Equal(HttpStatusCode.OK, responsePatchMultiple.StatusCode);
        string responseBodyPatchMultiple = await responsePatchMultiple.Content.ReadAsStringAsync();
        DataPatchResponseMultiple dataItem = JsonSerializer.Deserialize<DataPatchResponseMultiple>(responseBodyPatchMultiple, JsonSerializerOptions);
        Assert.NotNull(dataItem);
        Assert.Equal(2, dataItem.NewDataModels.Count);
        object dataItem1 = JsonSerializer.Serialize(dataItem.NewDataModels[0].Data);
        Assert.Equal("{\"RegNo\":\"dataobj1\"}", dataItem1.ToString());
        object dataItem2 = JsonSerializer.Serialize(dataItem.NewDataModels[1].Data);
        Assert.Equal("{\"RegNo\":\"dataobj2\"}", dataItem2.ToString());
    }

    [Fact]
    public async Task Delete_ReturnsOk()
    {
        Instance instance = await CreateInstance();
        DataElement dataElement = await CreateDataElement(instance, "datamodel");

        string dataPath = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/data/{dataElement.Id}";
        using HttpRequestMessage httpRequestMessageDelete = new(HttpMethod.Delete, dataPath);
        using HttpResponseMessage responseDelete = await HttpClient.SendAsync(httpRequestMessageDelete);
        Assert.Equal(HttpStatusCode.OK, responseDelete.StatusCode);
    }

    [Fact]
    public async Task Validate_ReturnsOk()
    {
        Instance instance = await CreateInstance();
        DataElement dataElement = await CreateDataElement(instance, "datamodel");
        string dataPath = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/data/{dataElement.Id}/validate";
        using HttpRequestMessage httpRequestMessageValidate = new(HttpMethod.Get, dataPath);
        using HttpResponseMessage responseValidate = await HttpClient.SendAsync(httpRequestMessageValidate);
        Assert.Equal(HttpStatusCode.OK, responseValidate.StatusCode);
    }

    [Fact]
    public async Task Tag_ReturnsCreateOkd()
    {
        Instance instance = await CreateInstance();
        DataElement dataElement = await CreateDataElement(instance, "datamodel");
        string dataPath = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/data/{dataElement.Id}/tags";
        using HttpRequestMessage httpRequestMessageTag = new(HttpMethod.Post, dataPath);
        httpRequestMessageTag.Content = new StringContent("\"test\"", System.Text.Encoding.UTF8, "application/json");
        using HttpResponseMessage responseTag = await HttpClient.SendAsync(httpRequestMessageTag);
        Assert.Equal(HttpStatusCode.Created, responseTag.StatusCode);
    }
}
