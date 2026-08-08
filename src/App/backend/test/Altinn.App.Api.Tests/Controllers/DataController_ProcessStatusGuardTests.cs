using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Json.Patch;
using Json.Pointer;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public sealed class DataControllerProcessStatusGuardTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 501337;

    public DataControllerProcessStatusGuardTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    [Theory]
    [InlineData("create")]
    [InlineData("update")]
    [InlineData("patch")]
    [InlineData("delete")]
    public async Task DataMutationRoutes_WhenProcessing_ReturnSameProblemBeforeMutation(string operation)
    {
        using HttpClient client = GetRootedUserClient(Org, App);
        using HttpResponseMessage createResponse = await client.PostAsync(
            $"{Org}/{App}/instances/?instanceOwnerPartyId={InstanceOwnerPartyId}",
            null
        );
        Instance createdInstance = await VerifyStatusAndDeserialize<Instance>(
            createResponse,
            System.Net.HttpStatusCode.Created
        );
        Guid instanceGuid = Guid.Parse(createdInstance.Id.Split('/')[1]);
        Guid dataGuid = Guid.Parse(createdInstance.Data.Should().ContainSingle().Which.Id);
        await TestData.SetProcessStatus(Org, App, InstanceOwnerPartyId, instanceGuid, ProcessStatus.Processing);
        try
        {
            using HttpRequestMessage request = CreateRequest(operation, instanceGuid, dataGuid);

            using HttpResponseMessage response = await client.SendAsync(request);

            await ProcessStatusProblemAssertions.AssertResponse(response, ProcessStatus.Processing);
            var storedInstance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, instanceGuid);
            storedInstance.Data.Should().ContainSingle(element => element.Id == dataGuid.ToString());
        }
        finally
        {
            TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, instanceGuid);
        }
    }

    private static HttpRequestMessage CreateRequest(string operation, Guid instanceGuid, Guid dataGuid)
    {
        string instanceUrl = $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{instanceGuid}/data";
        return operation switch
        {
            "create" => new HttpRequestMessage(HttpMethod.Post, $"{instanceUrl}/default")
            {
                Content = JsonContent.Create(new { }),
            },
            "update" => new HttpRequestMessage(HttpMethod.Put, $"{instanceUrl}/{dataGuid}")
            {
                Content = JsonContent.Create(new { }),
            },
            "patch" => new HttpRequestMessage(HttpMethod.Patch, instanceUrl)
            {
                Content = JsonContent.Create(
                    new DataPatchRequestMultiple
                    {
                        Patches =
                        [
                            new(
                                dataGuid,
                                new JsonPatch(
                                    PatchOperation.Replace(JsonPointer.Create("Navn"), JsonValue.Create("Changed"))
                                )
                            ),
                        ],
                    }
                ),
            },
            "delete" => new HttpRequestMessage(HttpMethod.Delete, $"{instanceUrl}/{dataGuid}"),
            _ => throw new ArgumentOutOfRangeException(nameof(operation), operation, null),
        };
    }
}
