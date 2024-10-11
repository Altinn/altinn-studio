using System.Net;
using System.Net.Http.Headers;
using Altinn.App.Api.Tests.Utils;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class DataController_UserAccessTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IDataProcessor> _dataProcessor = new();
    const string OrgId = "tdd";
    const string AppId = "contributer-restriction";

    public DataController_UserAccessTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_dataProcessor.Object);
        };
    }

    [Theory]
    [InlineData("userInteractionUnspecified", null, HttpStatusCode.Created)]
    [InlineData("userInteractionUnspecified", OrgId, HttpStatusCode.Created)]
    [InlineData("disallowUserCreate", null, HttpStatusCode.BadRequest)]
    [InlineData("disallowUserCreate", OrgId, HttpStatusCode.Created)]
    public async Task CreateDataElement_ImplementsAndValidates_AllowUserCreateProperty(
        string dataModelId,
        string? tokenOrgClaim,
        HttpStatusCode expectedStatusCode
    )
    {
        // Arrange
        var instance = await CreateAppInstance(tokenOrgClaim);

        // Act
        var response = await instance.AuthenticatedClient.PostAsync(
            $"/{instance.Org}/{instance.App}/instances/{instance.Id}/data?dataType={dataModelId}",
            null
        );

        // Assert
        response.Should().HaveStatusCode(expectedStatusCode);
    }

    [Theory]
    [InlineData("userInteractionUnspecified", null, HttpStatusCode.OK)]
    [InlineData("userInteractionUnspecified", OrgId, HttpStatusCode.OK)]
    [InlineData("disallowUserDelete", null, HttpStatusCode.OK)]
    [InlineData("disallowUserDelete", OrgId, HttpStatusCode.OK)]
    public async Task DeleteDataElement_ImplementsAndValidates_AllowUserDeleteProperty(
        string dataModelId,
        string? tokenOrgClaim,
        HttpStatusCode expectedStatusCode
    )
    {
        // Arrange
        var instance = await CreateAppInstance(tokenOrgClaim);

        /* Create a datamodel so we have something to delete */
        var systemClient = CreateAuthenticatedHttpClient(
            rootOrg: instance.Org,
            rootApp: instance.App,
            tokenOrgClaim: OrgId
        );
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
        response.Should().HaveStatusCode(expectedStatusCode);
    }

    private async Task<AppInstance> CreateAppInstance(string? tokenOrgClaim)
    {
        var instanceOwnerPartyId = 501337;
        var userId = 1337;
        HttpClient client = CreateAuthenticatedHttpClient(
            rootOrg: OrgId,
            rootApp: AppId,
            tokenUserClaim: userId,
            tokenOrgClaim: tokenOrgClaim
        );

        var response = await client.PostAsync(
            $"{OrgId}/{AppId}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}",
            null
        );
        var createResponseParsed = await VerifyStatusAndDeserialize<Instance>(response, HttpStatusCode.Created);

        return new AppInstance(createResponseParsed.Id, OrgId, AppId, client);
    }

    private HttpClient CreateAuthenticatedHttpClient(
        string rootOrg,
        string rootApp,
        int? tokenUserClaim = default,
        int? tokenPartyIdClaim = default,
        string? tokenOrgClaim = default
    )
    {
        HttpClient client = GetRootedClient(rootOrg, rootApp);
        string token = PrincipalUtil.GetToken(tokenUserClaim, tokenPartyIdClaim, org: tokenOrgClaim);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        return client;
    }

    private record AppInstance(string Id, string Org, string App, HttpClient AuthenticatedClient);
}
