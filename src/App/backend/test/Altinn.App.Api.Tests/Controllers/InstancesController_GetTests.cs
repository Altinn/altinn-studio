using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Api.Models;
using Altinn.App.Core.Constants;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class InstancesController_GetTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    public InstancesController_GetTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        OverrideServicesForAllTests = (services) => { };
    }

    [Fact]
    public async Task ReturnsOkResult_Raw()
    {
        // Arrange
        string org = "tdd";
        string app = "contributer-restriction";
        var userId = 1337;
        int instanceOwnerPartyId = 501337;

        using HttpClient client = GetRootedClient(org, app, includeTraceContext: true);
        string token = TestAuthentication.GetUserToken(userId: userId, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        var (createdInstance, createdResponse) = await InstancesControllerFixture.CreateInstanceSimplified(
            org,
            app,
            instanceOwnerPartyId,
            client,
            token
        );

        using var readResponse = await client.GetAsync($"{org}/{app}/instances/{createdInstance.Id}");
        Assert.Equal(HttpStatusCode.OK, readResponse.StatusCode);
        var readResponseContent = await readResponse.Content.ReadAsStringAsync();
        var readInstance = JsonSerializer.Deserialize<InstanceResponse>(
            readResponseContent,
            ApiTestBase.JsonSerializerOptions
        );

        await VerifyJson(
                $$"""
                    {
                        "createdResponse": {{createdResponse}},
                        "readResponse": {{readResponseContent}}
                    }
                """
            )
            .ScrubLinesWithReplace(line =>
            {
                line = line.Replace(createdInstance.Id, "<instancOwnerPartyId>/<instanceGuid>");
                foreach (var data in createdInstance.Data)
                    line = line.Replace(data.Id, "<dataId>");
                return line;
            });
    }

    [Fact]
    public async Task ReturnsOkResult_Deserialized()
    {
        // Arrange
        string org = "tdd";
        string app = "contributer-restriction";
        var userId = 1337;
        int instanceOwnerPartyId = 501337;

        using HttpClient client = GetRootedClient(org, app, includeTraceContext: true);
        string token = TestAuthentication.GetUserToken(userId: userId, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        var (createdInstance, createdResponse) = await InstancesControllerFixture.CreateInstanceSimplified(
            org,
            app,
            instanceOwnerPartyId,
            client,
            token
        );

        using var readResponse = await client.GetAsync($"{org}/{app}/instances/{createdInstance.Id}");
        Assert.Equal(HttpStatusCode.OK, readResponse.StatusCode);
        var readResponseContent = await readResponse.Content.ReadAsStringAsync();
        var readInstance = JsonSerializer.Deserialize<InstanceResponse>(
            readResponseContent,
            ApiTestBase.JsonSerializerOptions
        );

        await Verify(new { CreatedInstance = createdInstance, ReadInstance = readInstance })
            .ScrubLinesWithReplace(line =>
            {
                line = line.Replace(createdInstance.Id, "<instancOwnerPartyId>/<instanceGuid>");
                foreach (var data in createdInstance.Data)
                    line = line.Replace(data.Id, "<dataId>");
                return line;
            });
    }
}
