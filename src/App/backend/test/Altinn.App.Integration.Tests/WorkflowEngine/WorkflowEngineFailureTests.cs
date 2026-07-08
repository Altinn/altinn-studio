using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Xunit.Abstractions;
using CoreProcessState = Altinn.App.Core.Internal.Process.Elements.AppProcessState;
using WorkflowActivityStatus = Altinn.App.Core.Internal.Process.Elements.WorkflowActivityStatus;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
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
        await ResetScenario(fixture);

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        var scrubbers = new Scrubbers(StringScrubber: Scrubbers.InstanceStringScrubber(readInstantiationResponse));

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
        Assert.Equal("stepFailed", document.RootElement.GetProperty("workflowFailure").GetProperty("kind").GetString());
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

        await verifier.Verify(readProblem, snapshotName: "ProcessNextFailure", scrubbers: scrubbers);
        await verifier.Verify(refreshedInstance, snapshotName: "InstanceAfterFailure", scrubbers: scrubbers);
        await verifier
            .Verify(await fixture.GetSnapshotAppLogs(), snapshotName: "Logs")
            .AddScrubber(sb =>
            {
                var scrubbed = scrubbers.StringScrubber!(sb.ToString());
                sb.Clear();
                sb.Append(scrubbed);
            });
    }

    [Fact]
    public async Task GetProcess_AfterServiceTaskFailure_ReportsWorkflowFailedStatus()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-failure"
        );
        var fixture = fixtureScope.Fixture;
        var verifier = fixture.ScopedVerifier;
        await ResetScenario(fixture);

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using AppFixture.ReadApiResponse<Instance> instance = await CreateInstance(fixture, token);
        var scrubbers = new Scrubbers(StringScrubber: Scrubbers.InstanceStringScrubber(instance));
        await PatchValidFormData(fixture, token, instance);

        // Auto-continued service task fails permanently, leaving the transition-into-Task_Service
        // workflow FAILED while the instance stays committed on Task_Service.
        using var failedProcessNextResponse = await fixture.Instances.ProcessNext(token, instance);
        using var failedProcessNext = await failedProcessNextResponse.Read<ProblemDetails>();
        Assert.Equal(HttpStatusCode.InternalServerError, failedProcessNext.Response.StatusCode);

        using var instanceAfterFailureResponse = await fixture.Instances.Get(token, instance);
        using var instanceAfterFailure = await instanceAfterFailureResponse.Read<Instance>();
        Assert.Equal("Task_Service", instanceAfterFailure.Data.Model!.Process.CurrentTask!.ElementId);

        // The live workflow annotation on the read path must surface the failed transition.
        using var processResponse = await fixture.Instances.GetProcess(token, instanceAfterFailure);
        using var process = await processResponse.Read<CoreProcessState>();
        Assert.Equal(HttpStatusCode.OK, process.Response.StatusCode);

        CoreProcessState processState = process.Data.Model!;
        Assert.Equal("Task_Service", processState.CurrentTask!.ElementId);

        Assert.NotNull(processState.Workflow);
        Assert.Equal(WorkflowActivityStatus.Failed, processState.Workflow!.Status);

        Assert.NotNull(processState.Workflow.Failure);
        Assert.False(string.IsNullOrEmpty(processState.Workflow.Failure!.Detail));

        // The transition targeted the committed current task; the engine round-trips the
        // processNextTargetId label so the annotation resolves it back.
        Assert.Equal("Task_Service", processState.Workflow.TargetTask);

        await verifier.Verify(process, snapshotName: "ProcessWorkflowStatus", scrubbers: scrubbers);
    }

    [Fact]
    public async Task ResumeCurrentTask_AfterAutoContinuedServiceTaskFailure_ResumesServiceTaskAndCompletesProcess()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-failure"
        );
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture);

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using AppFixture.ReadApiResponse<Instance> instance = await CreateInstance(fixture, token);
        await PatchValidFormData(fixture, token, instance);

        using var failedProcessNextResponse = await fixture.Instances.ProcessNext(token, instance);
        using var failedProcessNext = await failedProcessNextResponse.Read<ProblemDetails>();

        Assert.Equal(HttpStatusCode.InternalServerError, failedProcessNext.Response.StatusCode);
        using JsonDocument failureDocument = JsonDocument.Parse(failedProcessNext.Data.Body!);
        JsonElement failureRoot = failureDocument.RootElement;
        Assert.Equal("stepFailed", failureRoot.GetProperty("workflowFailure").GetProperty("kind").GetString());
        Assert.Equal(
            "ExecuteServiceTask",
            failureRoot.GetProperty("workflowFailure").GetProperty("stepOperationId").GetString()
        );
        Assert.Contains(
            "Scenario service task failed permanently.",
            failureRoot.GetProperty("workflowFailure").GetProperty("lastError").GetProperty("message").GetString()
        );

        using var instanceAfterFailureResponse = await fixture.Instances.Get(token, instance);
        using var instanceAfterFailure = await instanceAfterFailureResponse.Read<Instance>();
        Assert.Equal("Task_Service", instanceAfterFailure.Data.Model!.Process.CurrentTask!.ElementId);

        using var blockedProcessNextResponse = await fixture.Instances.ProcessNext(token, instanceAfterFailure);
        using var blockedProcessNext = await blockedProcessNextResponse.Read<ProblemDetails>();
        Assert.Equal(HttpStatusCode.Conflict, blockedProcessNext.Response.StatusCode);
        using JsonDocument blockedDocument = JsonDocument.Parse(blockedProcessNext.Data.Body!);
        Assert.Equal("resumeRequired", blockedDocument.RootElement.GetProperty("processNextState").GetString());

        await AllowServiceTask(fixture);

        using var resumeResponse = await fixture.Instances.ResumeCurrentTask(token, instanceAfterFailure);
        using var resumedProcessState = await resumeResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, resumedProcessState.Response.StatusCode);
        Assert.Null(resumedProcessState.Data.Model!.CurrentTask);
        Assert.Equal("EndEvent_1", resumedProcessState.Data.Model.EndEvent);

        using var refreshedInstanceResponse = await fixture.Instances.Get(token, instanceAfterFailure);
        using var refreshedInstance = await refreshedInstanceResponse.Read<Instance>();
        Assert.Null(refreshedInstance.Data.Model!.Process.CurrentTask);
        Assert.Equal("EndEvent_1", refreshedInstance.Data.Model.Process.EndEvent);
    }

    private static async Task<AppFixture.ReadApiResponse<Instance>> CreateInstance(AppFixture fixture, string token)
    {
        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, readInstantiationResponse.Response.StatusCode);
        Assert.Equal("Task_1", readInstantiationResponse.Data.Model!.Process.CurrentTask!.ElementId);
        return readInstantiationResponse;
    }

    private static async Task PatchValidFormData(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        Guid dataElementId = Guid.Parse(instance.Data.Model!.Data.Single(d => d.DataType == "model").Id);
        using var patchResponse = await fixture.Instances.PatchFormData(
            token,
            instance,
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
        using var readPatchResponse = await patchResponse.Read<DataPatchResponseMultiple>();
        Assert.Equal(HttpStatusCode.OK, readPatchResponse.Response.StatusCode);
    }

    private static Task ResetScenario(AppFixture fixture) =>
        PostScenarioEndpoint(fixture, "/test/workflow-engine-failure/reset");

    private static Task AllowServiceTask(AppFixture fixture) =>
        PostScenarioEndpoint(fixture, "/test/workflow-engine-failure/allow-service-task");

    private static async Task PostScenarioEndpoint(AppFixture fixture, string path)
    {
        using var response = await fixture.GetDirectAppClient().PostAsync(path, null);
        response.EnsureSuccessStatusCode();
    }
}
