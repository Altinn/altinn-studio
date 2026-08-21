using System.Net;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineSuccessTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task ProcessNext_ServiceTaskSuccessWithoutAutoAdvance_StaysOnServiceTaskUntilManualNext()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-success-without-auto-advance"
        );
        var fixture = fixtureScope.Fixture;

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        Instance instance = readInstantiationResponse.Data.Model!;

        Guid dataElementId = Guid.Parse(instance.Data.Single(d => d.DataType == "model").Id);
        using var patchResponse = await fixture.Instances.PatchFormData(
            token,
            readInstantiationResponse,
            new DataPatchRequestMultiple
            {
                Patches =
                [
                    new(
                        dataElementId,
                        new JsonPatch(
                            PatchOperation.Replace(JsonPointer.Create("property1"), JsonNode.Parse("\"2\"")),
                            PatchOperation.Replace(JsonPointer.Create("property2"), JsonNode.Parse("\"2\""))
                        )
                    ),
                ],
                IgnoredValidators = null,
            }
        );
        using var readPatchResponse = await patchResponse.Read<DataPatchResponseMultiple>();
        Assert.Equal(HttpStatusCode.OK, readPatchResponse.Response.StatusCode);

        using var firstProcessNextResponse = await fixture.Instances.ProcessNext(token, readInstantiationResponse);
        using var firstProcessState = await firstProcessNextResponse.Read<AppProcessState>();

        Assert.Equal(HttpStatusCode.OK, firstProcessState.Response.StatusCode);
        Assert.Equal("Task_Service", firstProcessState.Data.Model!.CurrentTask!.ElementId);
        Assert.Null(firstProcessState.Data.Model.EndEvent);

        using var instanceAtServiceTaskResponse = await fixture.Instances.Get(token, readInstantiationResponse);
        using var instanceAtServiceTask = await instanceAtServiceTaskResponse.Read<Instance>();
        Assert.Equal("Task_Service", instanceAtServiceTask.Data.Model!.Process.CurrentTask!.ElementId);

        using var secondProcessNextResponse = await fixture.Instances.ProcessNext(token, instanceAtServiceTask);
        using var secondProcessState = await secondProcessNextResponse.Read<AppProcessState>();

        Assert.Equal(HttpStatusCode.OK, secondProcessState.Response.StatusCode);
        Assert.Null(secondProcessState.Data.Model!.CurrentTask);
        Assert.Equal("EndEvent_1", secondProcessState.Data.Model.EndEvent);
    }
}
