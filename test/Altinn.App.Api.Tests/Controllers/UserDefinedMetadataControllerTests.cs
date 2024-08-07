using System.Net;
using System.Net.Http.Headers;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Utils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class UserDefinedMetadataControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 501337;

    public UserDefinedMetadataControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    [Fact]
    public async Task PutUserDefinedMetadata_HappyPath_ReturnsOk()
    {
        HttpClient client = GetHttpClient();
        (string instanceId, string dataGuid) = await CreateInstanceAndDataElement(client);

        // Update custom metadata
        using var updateCustomMetadataContent = new StringContent(
            """{"userDefinedMetadata": [{ "key" : "TheKey", "value": "TheValue" }] }""",
            System.Text.Encoding.UTF8,
            "application/json"
        );

        HttpResponseMessage response = await client.PutAsync(
            $"/{Org}/{App}/instances/{instanceId}/data/{dataGuid}/user-defined-metadata",
            updateCustomMetadataContent
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify stored data
        HttpResponseMessage readDataElementResponse = await client.GetAsync(
            $"/{Org}/{App}/instances/{instanceId}/data/{dataGuid}/user-defined-metadata"
        );

        var readDataElementResponseParsed = await VerifyStatusAndDeserialize<UserDefinedMetadataDto>(
            readDataElementResponse,
            HttpStatusCode.OK
        );

        readDataElementResponseParsed
            .UserDefinedMetadata.Should()
            .BeEquivalentTo(
                new List<KeyValueEntry>
                {
                    new() { Key = "TheKey", Value = "TheValue" }
                }
            );
    }

    [Fact]
    public async Task PutUserDefinedMetadata_DuplicatedKey_ReturnsBadRequest()
    {
        HttpClient client = GetHttpClient();
        (string instanceId, string dataGuid) = await CreateInstanceAndDataElement(client);

        // Update custom metadata
        using var updateCustomMetadataContent = new StringContent(
            """{"userDefinedMetadata": [{ "key" : "DuplicatedKey", "value": "TheValue" }, { "key": "DuplicatedKey", "value": "TheValue" }] }""",
            System.Text.Encoding.UTF8,
            "application/json"
        );

        HttpResponseMessage response = await client.PutAsync(
            $"/{Org}/{App}/instances/{instanceId}/data/{dataGuid}/user-defined-metadata",
            updateCustomMetadataContent
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        string responseMessage = await response.Content.ReadAsStringAsync();
        responseMessage.Should().Contain("The following keys are duplicated: DuplicatedKey");
    }

    [Fact]
    public async Task PutUserDefinedMetadata_NotAllowedKey_ReturnsBadRequest()
    {
        HttpClient client = GetHttpClient();
        (string instanceId, string dataGuid) = await CreateInstanceAndDataElement(client);

        // Update custom metadata
        using var updateCustomMetadataContent = new StringContent(
            """{"userDefinedMetadata": [{ "key" : "SomeKeyThatIsNotAllowed", "value": "TheValue" }, { "key": "TheKey", "value": "TheValue" }] }""",
            System.Text.Encoding.UTF8,
            "application/json"
        );

        HttpResponseMessage response = await client.PutAsync(
            $"/{Org}/{App}/instances/{instanceId}/data/{dataGuid}/user-defined-metadata",
            updateCustomMetadataContent
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        string responseMessage = await response.Content.ReadAsStringAsync();
        responseMessage.Should().Contain("The following keys are not allowed: SomeKeyThatIsNotAllowed");
    }

    [Fact]
    public async Task PutUserDefinedMetadata_InvalidDataElementId_ReturnsNotFound()
    {
        HttpClient client = GetHttpClient();

        // Create instance
        HttpResponseMessage createResponse = await client.PostAsync(
            $"{Org}/{App}/instances/?instanceOwnerPartyId={InstanceOwnerPartyId}",
            null
        );

        var createdInstance = await VerifyStatusAndDeserialize<Instance>(createResponse, HttpStatusCode.Created);
        string? instanceId = createdInstance.Id;

        // Update custom metadata
        using var updateCustomMetadataContent = new StringContent(
            """{"userDefinedMetadata": [{ "key" : "SomeKeyThatIsNotAllowed", "value": "TheValue" }, { "key": "TheKey", "value": "TheValue" }] }""",
            System.Text.Encoding.UTF8,
            "application/json"
        );

        HttpResponseMessage response = await client.PutAsync(
            $"/{Org}/{App}/instances/{instanceId}/data/{Guid.NewGuid()}/user-defined-metadata",
            updateCustomMetadataContent
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        string responseMessage = await response.Content.ReadAsStringAsync();
        responseMessage.Should().Contain("Unable to find data element based on the given parameters.");
    }

    private async Task<(string instanceId, string dataGuid)> CreateInstanceAndDataElement(HttpClient client)
    {
        // Create instance
        HttpResponseMessage createResponse = await client.PostAsync(
            $"{Org}/{App}/instances/?instanceOwnerPartyId={InstanceOwnerPartyId}",
            null
        );

        var createdInstance = await VerifyStatusAndDeserialize<Instance>(createResponse, HttpStatusCode.Created);
        string? instanceId = createdInstance.Id;

        // Create data element (not sure why it isn't created when the instance is created, autoCreate is true)
        using var createDataElementContent = new StringContent(
            """{"melding":{"name": "Ola Normann"}}""",
            System.Text.Encoding.UTF8,
            "application/json"
        );

        HttpResponseMessage createDataElementResponse = await client.PostAsync(
            $"/{Org}/{App}/instances/{instanceId}/data?dataType=default",
            createDataElementContent
        );

        var createDataElementResponseParsed = await VerifyStatusAndDeserialize<DataElement>(
            createDataElementResponse,
            HttpStatusCode.Created
        );

        string? dataGuid = createDataElementResponseParsed.Id;
        return (instanceId, dataGuid);
    }

    private HttpClient GetHttpClient()
    {
        HttpClient client = GetRootedClient(Org, App);
        string token = PrincipalUtil.GetToken(1337, null);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
