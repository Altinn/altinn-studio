using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Mocks;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Json.Patch;
using Json.Pointer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class DataControllerProcessVersionAdmissionTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string App = "process-version-admission";
    private const int InstanceOwnerPartyId = 501337;
    private static readonly Guid _instanceGuid = new("d2af1cfd-db99-45f9-9625-9dfa1223485f");
    private static readonly string _instanceId = $"{InstanceOwnerPartyId}/{_instanceGuid}";
    private static readonly Guid _dataGuid = new("ed4c42a4-a6a0-4aec-b8e9-9f5d34c445ca");

    public DataControllerProcessVersionAdmissionTests(
        WebApplicationFactory<Program> factory,
        ITestOutputHelper outputHelper
    )
        : base(factory, outputHelper)
    {
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
    }

    [Fact]
    public async Task PatchWithPreTransitionProcessStateVersion_AfterProcessNextToActiveTask_ReturnsPreconditionFailedBeforeMutation()
    {
        var storageMetadata = new ApiTestStorageMetadata();
        OverrideServicesForThisTest = services => services.Replace(ServiceDescriptor.Singleton(storageMetadata));
        using HttpClient client = GetRootedUserClient(Org, App);

        Instance callerInstance = await Services
            .GetRequiredService<IInstanceClient>()
            .GetInstance(
                App,
                Org,
                InstanceOwnerPartyId,
                _instanceGuid,
                authenticationMethod: null,
                CancellationToken.None
            );
        callerInstance.Process.CurrentTask.ElementId.Should().Be("Task_1");
        int expectedVersion = storageMetadata.GetVersions(callerInstance.Id).ProcessStateVersion!.Value;

        using HttpResponseMessage processNextResponse = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next",
            content: null
        );
        processNextResponse.Should().HaveStatusCode(HttpStatusCode.OK);
        int actualVersion = storageMetadata.GetVersions(_instanceId).ProcessStateVersion!.Value;
        actualVersion.Should().BeGreaterThan(expectedVersion);

        Instance activeInstance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        activeInstance.Process.Ended.Should().BeNull();
        activeInstance.Process.CurrentTask.ElementId.Should().Be("Task_2");
        activeInstance.Status!.IsArchived.Should().BeFalse();
        activeInstance.Status.Archived.Should().BeNull();
        activeInstance.Data.Should().ContainSingle(element => element.Id == _dataGuid.ToString());
        int mutationRequestCountBeforePatch = storageMetadata.AggregateMutationRequestCount;

        var patchRequest = new DataPatchRequestMultiple
        {
            ExpectedProcessStateVersion = expectedVersion,
            Patches =
            [
                new(
                    _dataGuid,
                    new JsonPatch(PatchOperation.Replace(JsonPointer.Create("Navn"), JsonValue.Create("Updated name")))
                ),
            ],
        };
        using JsonContent patchContent = JsonContent.Create(patchRequest, options: JsonSerializerOptions);
        using HttpResponseMessage patchResponse = await client.PatchAsync(
            $"{Org}/{App}/instances/{_instanceId}/data",
            patchContent
        );
        ProblemDetails problemDetails = await VerifyStatusAndDeserialize<ProblemDetails>(
            patchResponse,
            HttpStatusCode.PreconditionFailed
        );

        problemDetails.Status.Should().Be(StatusCodes.Status412PreconditionFailed);
        problemDetails.Title.Should().Be("Process state has changed");
        problemDetails.Detail.Should().Contain(expectedVersion.ToString());
        problemDetails.Detail.Should().Contain(actualVersion.ToString());
        ((JsonElement)problemDetails.Extensions["expectedVersion"]!).GetInt32().Should().Be(expectedVersion);
        ((JsonElement)problemDetails.Extensions["actualVersion"]!).GetInt32().Should().Be(actualVersion);
        patchResponse.Content.Headers.ContentType?.MediaType.Should().Be("application/problem+json");
        storageMetadata.AggregateMutationRequestCount.Should().Be(mutationRequestCountBeforePatch);
    }
}
