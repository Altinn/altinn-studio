using System.Net;
using Altinn.App.Api.Tests.Data;
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
    [InlineData("userInteractionUnspecified", false, HttpStatusCode.Created)]
    [InlineData("userInteractionUnspecified", true, HttpStatusCode.Created)]
    [InlineData("disallowUserCreate", false, HttpStatusCode.BadRequest)]
    [InlineData("disallowUserCreate", true, HttpStatusCode.Created)]
    public async Task CreateDataElement_ImplementsAndValidates_AllowUserCreateProperty(
        string dataModelId,
        bool actAsOrg,
        HttpStatusCode expectedStatusCode
    )
    {
        // Arrange
        var instance = await CreateAppInstance(actAsOrg);

        // Act
        var response = await instance.AuthenticatedClient.PostAsync(
            $"/{instance.Org}/{instance.App}/instances/{instance.Id}/data?dataType={dataModelId}",
            null
        );

        // Assert
        response.Should().HaveStatusCode(expectedStatusCode);

        TestData.DeleteInstanceAndData(OrgId, AppId, instance.Id);
    }

    [Theory]
    [InlineData("userInteractionUnspecified", false, HttpStatusCode.OK)]
    [InlineData("userInteractionUnspecified", true, HttpStatusCode.OK)]
    [InlineData("disallowUserDelete", false, HttpStatusCode.BadRequest)]
    [InlineData("disallowUserDelete", true, HttpStatusCode.OK)]
    public async Task DeleteDataElement_ImplementsAndValidates_AllowUserDeleteProperty(
        string dataModelId,
        bool instantiateAsOrg,
        HttpStatusCode expectedStatusCode
    )
    {
        // Arrange
        var instance = await CreateAppInstance(instantiateAsOrg);

        /* Create a datamodel so we have something to delete */
        using var systemClient = GetRootedOrgClient(OrgId, AppId, serviceOwnerOrg: OrgId);
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

        TestData.DeleteInstanceAndData(OrgId, AppId, instance.Id);
    }

    private async Task<AppInstance> CreateAppInstance(bool actAsOrg)
    {
        var instanceOwnerPartyId = 501337;
        var userId = 1337;
        HttpClient client = actAsOrg
            ? GetRootedOrgClient(OrgId, AppId, serviceOwnerOrg: OrgId)
            : GetRootedUserClient(OrgId, AppId, userId, instanceOwnerPartyId);

        var response = await client.PostAsync(
            $"{OrgId}/{AppId}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}",
            null
        );
        var createResponseParsed = await VerifyStatusAndDeserialize<Instance>(response, HttpStatusCode.Created);

        return new AppInstance(createResponseParsed.Id, OrgId, AppId, client);
    }

    private record AppInstance(string Id, string Org, string App, HttpClient AuthenticatedClient);
}
