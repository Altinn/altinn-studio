using System.Net;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
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
        using HttpClient client = GetRootedUserClient(Org, App, 1337);
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
                    new() { Key = "TheKey", Value = "TheValue" },
                }
            );
        TestData.DeleteInstanceAndData(Org, App, instanceId);
    }

    [Fact]
    public async Task PutUserDefinedMetadata_DuplicatedKey_ReturnsBadRequest()
    {
        using HttpClient client = GetRootedUserClient(Org, App, 1337);
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
        TestData.DeleteInstanceAndData(Org, App, instanceId);
    }

    [Fact]
    public async Task PutUserDefinedMetadata_NotAllowedKey_ReturnsBadRequest()
    {
        using HttpClient client = GetRootedUserClient(Org, App, 1337);
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
        TestData.DeleteInstanceAndData(Org, App, instanceId);
    }

    [Fact]
    public async Task PutUserDefinedMetadata_InvalidDataElementId_ReturnsNotFound()
    {
        using HttpClient client = GetRootedUserClient(Org, App, 1337);

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

        // DataElement is created automatically by ProcessTaskInitializer since autoCreate=true
        string dataGuid = createdInstance.Data.First(x => x.DataType.Equals("default")).Id;
        string instanceId = createdInstance.Id;

        return (instanceId, dataGuid);
    }
}
