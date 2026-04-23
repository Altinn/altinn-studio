using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

[Trait("Category", "Integration")]
public class WorkflowEngineFailureTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task ProcessNext_AutoContinuedServiceTaskFailure_ReturnsProblemDetailsAndUpdatedProcessState()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-failure"
        );
        var fixture = fixtureScope.Fixture;
        var verifier = fixture.ScopedVerifier;

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var readInstantiationResponse = await instantiationResponse.Read<Instance>();

        Guid dataElementId = Guid.Parse(
            readInstantiationResponse.Data.Model!.Data.Single(d => d.DataType == "model").Id
        );
        using var patchResponse = await fixture.Instances.PatchFormData(
            token,
            readInstantiationResponse,
            new DataPatchRequestMultiple
            {
                Patches =
                [
                    new(
                        dataElementId,
                        new Json.Patch.JsonPatch(
                            Json.Patch.PatchOperation.Replace(
                                Json.Pointer.JsonPointer.Create("property1"),
                                JsonNode.Parse("\"2\"")
                            ),
                            Json.Patch.PatchOperation.Replace(
                                Json.Pointer.JsonPointer.Create("property2"),
                                JsonNode.Parse("\"2\"")
                            )
                        )
                    ),
                ],
                IgnoredValidators = null,
            }
        );
        using var _ = await patchResponse.Read<DataPatchResponseMultiple>();

        using var processNextResponse = await fixture.Instances.ProcessNext(token, readInstantiationResponse);
        using var readProblem = await processNextResponse.Read<ProblemDetails>();

        Assert.Equal(HttpStatusCode.InternalServerError, readProblem.Response.StatusCode);
        Assert.True(readProblem.Data.Model!.Extensions.ContainsKey("workflowFailure"));
        Assert.True(readProblem.Data.Model.Extensions.ContainsKey("processStateChanged"));
        Assert.True(readProblem.Data.Model.Extensions.ContainsKey("processState"));

        using var refreshedInstanceResponse = await fixture.Instances.Get(token, readInstantiationResponse);
        using var refreshedInstance = await refreshedInstanceResponse.Read<Instance>();
        Assert.Equal("Task_Service", refreshedInstance.Data.Model!.Process.CurrentTask!.ElementId);

        using JsonDocument document = JsonDocument.Parse(readProblem.Data.Body!);
        Assert.Equal("StepFailed", document.RootElement.GetProperty("workflowFailure").GetProperty("kind").GetString());
        Assert.Equal(
            "resumeWorkflow",
            document.RootElement.GetProperty("workflowFailure").GetProperty("retryAction").GetString()
        );
        Assert.True(document.RootElement.GetProperty("processStateChanged").GetBoolean());
        Assert.Equal(
            "Task_Service",
            document
                .RootElement.GetProperty("processState")
                .GetProperty("currentTask")
                .GetProperty("elementId")
                .GetString()
        );

        await verifier.Verify<ProblemDetails>(readProblem, snapshotName: "ProcessNextFailure");
        await verifier.Verify<Instance>(refreshedInstance, snapshotName: "InstanceAfterFailure");
        await verifier.Verify(fixture.GetSnapshotAppLogs(), snapshotName: "Logs");
    }
}
