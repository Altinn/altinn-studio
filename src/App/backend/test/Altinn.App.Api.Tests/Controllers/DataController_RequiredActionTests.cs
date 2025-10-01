using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class DataController_RequiredActionTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string OrgId = "tdd";
    private const string AppId = "contributer-restriction";
    private const int InstanceOwnerPartyId = 501337;
    private const int UserId = 1337;

    public DataController_RequiredActionTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    [Theory]
    [InlineData("userInteractionUnspecified", false, HttpStatusCode.OK)]
    [InlineData("userInteractionUnspecified", true, HttpStatusCode.OK)]
    [InlineData("requiresActionToRead", false, HttpStatusCode.Forbidden)]
    [InlineData("requiresActionToRead", true, HttpStatusCode.OK)]
    public async Task ReadDataElement_ImplementsAndValidates_ActionRequiredToReadProperty(
        string dataModelId,
        bool instantiateAsOrg,
        HttpStatusCode expectedStatusCode
    )
    {
        // Arrange
        using var instance = await CreateAppInstance(instantiateAsOrg);

        /* Create a datamodel so we have something to delete */
        using var systemClient = GetRootedOrgClient();
        var createResponse = await systemClient.PostAsync(
            $"/{instance.Org}/{instance.App}/instances/{instance.Id}/data?dataType={dataModelId}",
            null
        );
        var createResponseParsed = await VerifyStatusAndDeserialize<DataElement>(
            createResponse,
            HttpStatusCode.Created
        );

        // Act
        var response = await instance.AuthenticatedClient.GetAsync(
            $"/{instance.Org}/{instance.App}/instances/{instance.Id}/data/{createResponseParsed.Id}"
        );

        // Assert
        Assert.Equal(expectedStatusCode, response.StatusCode);

        TestData.DeleteInstanceAndData(OrgId, AppId, instance.Id);
    }

    [Theory]
    [InlineData("userInteractionUnspecified", false, HttpStatusCode.Created)]
    [InlineData("userInteractionUnspecified", true, HttpStatusCode.Created)]
    [InlineData("requiresActionToWrite", false, HttpStatusCode.Forbidden)]
    [InlineData("requiresActionToWrite", true, HttpStatusCode.Created)]
    public async Task CreateDataElement_ImplementsAndValidates_ActionRequiredToWriteProperty(
        string dataModelId,
        bool instantiateAsOrg,
        HttpStatusCode expectedStatusCode
    )
    {
        // Arrange
        using var instance = await CreateAppInstance(instantiateAsOrg);

        // Act
        var response = await instance.AuthenticatedClient.PostAsync(
            $"/{instance.Org}/{instance.App}/instances/{instance.Id}/data?dataType={dataModelId}",
            null
        );

        // Assert
        Assert.Equal(expectedStatusCode, response.StatusCode);

        TestData.DeleteInstanceAndData(OrgId, AppId, instance.Id);
    }

    [Theory]
    [InlineData("userInteractionUnspecified", false, HttpStatusCode.Created)]
    [InlineData("userInteractionUnspecified", true, HttpStatusCode.Created)]
    [InlineData("requiresActionToWrite", false, HttpStatusCode.Forbidden)]
    [InlineData("requiresActionToWrite", true, HttpStatusCode.Created)]
    public async Task PutDataElement_ImplementsAndValidates_ActionRequiredToWriteProperty(
        string dataModelId,
        bool instantiateAsOrg,
        HttpStatusCode expectedStatusCode
    )
    {
        // Arrange
        using var instance = await CreateAppInstance(instantiateAsOrg);

        /* Create a datamodel so we have something to delete */
        using var systemClient = GetRootedOrgClient();
        var createResponse = await systemClient.PostAsync(
            $"/{instance.Org}/{instance.App}/instances/{instance.Id}/data?dataType={dataModelId}",
            null
        );
        var createResponseParsed = await VerifyStatusAndDeserialize<DataElement>(
            createResponse,
            HttpStatusCode.Created
        );
        using var updateDataElementContent = new StringContent(
            """{"melding":{"name": "Ola Olsen"}}""",
            Encoding.UTF8,
            "application/json"
        );

        // Act
        var response = await instance.AuthenticatedClient.PutAsync(
            $"/{instance.Org}/{instance.App}/instances/{instance.Id}/data/{createResponseParsed.Id}",
            updateDataElementContent
        );

        // Assert
        Assert.Equal(expectedStatusCode, response.StatusCode);

        TestData.DeleteInstanceAndData(OrgId, AppId, instance.Id);
    }

    [Theory]
    [InlineData("userInteractionUnspecified", false, HttpStatusCode.OK)]
    [InlineData("userInteractionUnspecified", true, HttpStatusCode.OK)]
    [InlineData("requiresActionToWrite", false, HttpStatusCode.Forbidden)]
    [InlineData("requiresActionToWrite", true, HttpStatusCode.OK)]
    public async Task PatchDataElement_ImplementsAndValidates_ActionRequiredToWriteProperty(
        string dataModelId,
        bool instantiateAsOrg,
        HttpStatusCode expectedStatusCode
    )
    {
        // Arrange
        using var instance = await CreateAppInstance(instantiateAsOrg);

        /* Create a datamodel so we have something to delete */
        using var systemClient = GetRootedOrgClient();
        var createResponse = await systemClient.PostAsync(
            $"/{instance.Org}/{instance.App}/instances/{instance.Id}/data?dataType={dataModelId}",
            new StringContent("""{"melding":{"name": "Ola Olsen"}}""", Encoding.UTF8, "application/json")
        );
        var createResponseParsed = await VerifyStatusAndDeserialize<DataElement>(
            createResponse,
            HttpStatusCode.Created
        );

        var pointer = JsonPointer.Create("melding", "name");
        var patch = new JsonPatch(
            PatchOperation.Test(pointer, JsonNode.Parse("\"Ola Olsen\"")),
            PatchOperation.Replace(pointer, JsonNode.Parse("\"Olga Olsen\""))
        );
        var serializedPatch = JsonSerializer.Serialize(
            new DataPatchRequest() { Patch = patch },
            DataControllerPatchTests._jsonSerializerOptions
        );
        using var updateDataElementContent = new StringContent(serializedPatch, Encoding.UTF8, "application/json");

        // Act
        var response = await instance.AuthenticatedClient.PatchAsync(
            $"/{instance.Org}/{instance.App}/instances/{instance.Id}/data/{createResponseParsed.Id}",
            updateDataElementContent
        );

        // Assert
        Assert.Equal(expectedStatusCode, response.StatusCode);

        TestData.DeleteInstanceAndData(OrgId, AppId, instance.Id);
    }

    [Theory]
    [InlineData("userInteractionUnspecified", false, HttpStatusCode.OK)]
    [InlineData("userInteractionUnspecified", true, HttpStatusCode.OK)]
    [InlineData("requiresActionToWrite", false, HttpStatusCode.Forbidden)]
    [InlineData("requiresActionToWrite", true, HttpStatusCode.OK)]
    public async Task DeleteDataElement_ImplementsAndValidates_ActionRequiredToWriteProperty(
        string dataModelId,
        bool instantiateAsOrg,
        HttpStatusCode expectedStatusCode
    )
    {
        // Arrange
        using var instance = await CreateAppInstance(instantiateAsOrg);

        /* Create a datamodel so we have something to delete */
        using var systemClient = GetRootedOrgClient();
        var createResponse = await systemClient.PostAsync(
            $"/{instance.Org}/{instance.App}/instances/{instance.Id}/data?dataType={dataModelId}",
            null
        );
        var createResponseParsed = await VerifyStatusAndDeserialize<DataElement>(
            createResponse,
            HttpStatusCode.Created
        );

        // Act
        var response = await instance.AuthenticatedClient.DeleteAsync(
            $"/{instance.Org}/{instance.App}/instances/{instance.Id}/data/{createResponseParsed.Id}"
        );

        // Assert
        Assert.Equal(expectedStatusCode, response.StatusCode);

        TestData.DeleteInstanceAndData(OrgId, AppId, instance.Id);
    }

    private async Task<AppInstance> CreateAppInstance(bool hasOrgAuthorization)
    {
        HttpClient client = hasOrgAuthorization ? GetRootedOrgClient() : GetRootedUserClient();

        var response = await client.PostAsync(
            $"{OrgId}/{AppId}/instances/?instanceOwnerPartyId={InstanceOwnerPartyId}",
            null
        );
        var createResponseParsed = await VerifyStatusAndDeserialize<Instance>(response, HttpStatusCode.Created);

        return new AppInstance(createResponseParsed.Id, OrgId, AppId, client);
    }

    private record AppInstance(string Id, string Org, string App, HttpClient AuthenticatedClient) : IDisposable
    {
        public void Dispose() => AuthenticatedClient.Dispose();
    }

    private HttpClient GetRootedOrgClient() =>
        GetRootedOrgClient(
            OrgId,
            AppId,
            serviceOwnerOrg: OrgId,
            configureServices: services => SetupAuthorizationMock(services, true)
        );

    private HttpClient GetRootedUserClient() =>
        GetRootedUserClient(
            OrgId,
            AppId,
            UserId,
            InstanceOwnerPartyId,
            configureServices: services => SetupAuthorizationMock(services, false)
        );

    private static void SetupAuthorizationMock(IServiceCollection services, bool hasOrgAuthorization)
    {
        var authorizationClientMock = new Mock<IAuthorizationClient>();
        authorizationClientMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>()
                )
            )
            .ReturnsAsync(
                (AppIdentifier app, InstanceIdentifier instance, ClaimsPrincipal user, string action, string? org) =>
                    action switch
                    {
                        null => true,
                        "customReadAction" => hasOrgAuthorization,
                        "customWriteAction" => hasOrgAuthorization,
                        _ => throw new NotImplementedException($"Action '{action}' is not implemented in the mock."),
                    }
            );

        services.AddSingleton(authorizationClientMock.Object);
    }
}
