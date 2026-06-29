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
public class WorkflowEnginePdfTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task ProcessNext_PdfServiceTask_GeneratesPdfAndCompletesWorkflow()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-pdf-service-task"
        );
        var fixture = fixtureScope.Fixture;

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, readInstantiationResponse.Response.StatusCode);

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

        using var processNextResponse = await fixture.Instances.ProcessNext(token, readInstantiationResponse);
        using var processState = await processNextResponse.Read<AppProcessState>();

        Assert.Equal(HttpStatusCode.OK, processState.Response.StatusCode);
        Assert.Null(processState.Data.Model!.CurrentTask);
        Assert.Equal("EndEvent_1", processState.Data.Model.EndEvent);

        using var refreshedInstanceResponse = await fixture.Instances.Get(token, readInstantiationResponse);
        using var refreshedInstance = await refreshedInstanceResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.OK, refreshedInstance.Response.StatusCode);
        Assert.Contains(refreshedInstance.Data.Model!.Data, data => data.DataType == "ref-data-as-pdf");
    }
}
