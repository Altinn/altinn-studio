#nullable disable
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Designer.Tests.Controllers.PreviewController;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.Preview;

public class InstancesControllerTests(
        WebApplicationFactory<Program> factory
) : PreviewControllerTestsBase<DataControllerTests>(factory), IClassFixture<WebApplicationFactory<Program>>
{

    [Fact]
    public async Task Post_ReturnsCreated()
    {
        Instance instance = await CreateInstance();
        Assert.NotNull(instance);
        Assert.NotNull(instance.Id);
    }

    [Fact]
    public async Task GetInstance_ReturnsOk()
    {
        Instance instance = await CreateInstance();
        Assert.NotNull(instance);
        Assert.NotNull(instance.Id);

        string dataPath = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPath);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string responseBody = await response.Content.ReadAsStringAsync();
        Instance responseInstance = JsonSerializer.Deserialize<Instance>(responseBody, JsonSerializerOptions);
        Assert.NotNull(responseInstance);
        Assert.Equal(instance.Id, responseInstance.Id);
    }

    [Fact]
    public async Task Validate_ReturnsOk()
    {
        Instance instance = await CreateInstance();
        string dataPath = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/validate";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPath);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Process_ReturnsOk()
    {
        Instance instance = await CreateInstance();
        string dataPath = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/process";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPath);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ProcessNext_ReturnsOk()
    {
        Instance instance = await CreateInstance();
        string dataPath = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/process/next";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPath);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
