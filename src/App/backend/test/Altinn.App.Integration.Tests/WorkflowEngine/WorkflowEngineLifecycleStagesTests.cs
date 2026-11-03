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

/// <summary>
/// The recovery property of a multi-stage lifecycle pipeline, through a real engine: a transition into a task
/// whose start pipeline has two stages. Stage A saves a data element and completes; stage B fails permanently
/// while the scenario blocks it, then defers once and completes. Recovery must re-enter at stage B only, and stage
/// A's data must survive.
/// </summary>
[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineLifecycleStagesTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private const string Scenario = "lifecycle-stage-recovery";

    [Fact]
    public async Task ProcessNext_LaterStartStageFailsThenRecovers_ReEntersAtThatStage()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic, scenario: Scenario);
        var fixture = fixtureScope.Fixture;
        await PostScenarioEndpoint(fixture, $"/test/{Scenario}/reset");

        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using AppFixture.ReadApiResponse<Instance> instance = await CreateInstance(fixture, token);
        await PatchValidFormData(fixture, token, instance);

        // Stage A saves its record and completes as a step of its own; stage B fails permanently. The
        // transition stores Task_2 before the task starts, so the failure leaves the instance on Task_2.
        using var failedProcessNextResponse = await fixture.Instances.ProcessNext(token, instance);
        using var failedProcessNext = await failedProcessNextResponse.Read<ProblemDetails>();
        Assert.Equal(HttpStatusCode.InternalServerError, failedProcessNext.Response.StatusCode);
        using JsonDocument failureDocument = JsonDocument.Parse(failedProcessNext.Data.Body!);
        JsonElement failure = failureDocument.RootElement.GetProperty("workflowFailure");
        Assert.Equal("stepFailed", failure.GetProperty("kind").GetString());
        // Stage B is the second stage of Task_2's start pipeline, so it is the step at index 1.
        Assert.Equal("StartTask: 1", failure.GetProperty("stepOperationId").GetString());

        using var instanceAfterFailureResponse = await fixture.Instances.Get(token, instance);
        using var instanceAfterFailure = await instanceAfterFailureResponse.Read<Instance>();
        Assert.Equal("Task_2", instanceAfterFailure.Data.Model!.Process.CurrentTask!.ElementId);
        // Stage A's save committed with its own step, so its data is there although stage B failed.
        DataElement recordAfterFailure = Assert.Single(
            instanceAfterFailure.Data.Model.Data,
            d => d.DataType == "attachment"
        );
        Assert.Equal("stage-a.txt", recordAfterFailure.Filename);

        using var processResponse = await fixture.Instances.GetProcess(token, instanceAfterFailure);
        using var process = await processResponse.Read<CoreProcessState>();
        Assert.Equal(HttpStatusCode.OK, process.Response.StatusCode);
        Assert.Equal("Task_2", process.Data.Model!.CurrentTask!.ElementId);
        Assert.Equal(WorkflowActivityStatus.Failed, process.Data.Model.Workflow!.Status);
        Assert.Equal("Task_2", process.Data.Model.Workflow.TargetTask);

        // Recovery resumes the failed step only. Stage B defers once, after the commit, so the resume answers 202
        // if it sees the workflow parked and 200 if the stage has already completed; the settled state is polled.
        await PostScenarioEndpoint(fixture, $"/test/{Scenario}/allow-stage-b");
        using var resumeResponse = await fixture.Instances.ResumeCurrentTask(token, instanceAfterFailure);
        using var resumedProcessState = await resumeResponse.Read<CoreProcessState>();
        Assert.Contains(resumedProcessState.Response.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Accepted });
        await WaitForIdle(fixture, token, instance);

        using var instanceAfterRecoveryResponse = await fixture.Instances.Get(token, instance);
        using var instanceAfterRecovery = await instanceAfterRecoveryResponse.Read<Instance>();
        Assert.Equal("Task_2", instanceAfterRecovery.Data.Model!.Process.CurrentTask!.ElementId);
        // Still the one record: stage A did not run again on recovery.
        DataElement recordAfterRecovery = Assert.Single(
            instanceAfterRecovery.Data.Model.Data,
            d => d.DataType == "attachment"
        );
        Assert.Equal(recordAfterFailure.Id, recordAfterRecovery.Id);

        string logs = await fixture.GetSnapshotAppLogs();
        AssertInOrder(
            logs,
            "Lifecycle.StageA.Run1.Completed",
            "Lifecycle.StageB.Run1.FailedPermanent",
            "Lifecycle.StageB.Run2.Defer",
            "Lifecycle.StageB.Run3.Completed"
        );
        Assert.DoesNotContain("Lifecycle.StageA.Run2", logs);
        Assert.DoesNotContain("Lifecycle.StageB.Run4", logs);
    }

    private static async Task<AppFixture.ReadApiResponse<Instance>> CreateInstance(AppFixture fixture, string token)
    {
        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
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

    private static async Task WaitForIdle(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        DateTimeOffset deadline = DateTimeOffset.UtcNow + TimeSpan.FromSeconds(60);
        WorkflowActivityStatus? lastSeenStatus = null;
        while (DateTimeOffset.UtcNow < deadline)
        {
            using var processResponse = await fixture.Instances.GetProcess(token, instance);
            using var process = await processResponse.Read<CoreProcessState>();
            lastSeenStatus = process.Data.Model?.Workflow?.Status;
            if (lastSeenStatus == WorkflowActivityStatus.Idle)
            {
                return;
            }

            await Task.Delay(TimeSpan.FromMilliseconds(500));
        }

        Assert.Fail($"The transition did not settle within the deadline (last seen status: {lastSeenStatus}).");
    }

    private static async Task PostScenarioEndpoint(AppFixture fixture, string path)
    {
        using var response = await fixture.GetDirectAppClient().PostAsync(path, null);
        response.EnsureSuccessStatusCode();
    }

    private static void AssertInOrder(string logs, params string[] messages)
    {
        int previousIndex = -1;
        foreach (string message in messages)
        {
            int index = logs.IndexOf(message, previousIndex + 1, StringComparison.Ordinal);
            Assert.True(index >= 0, $"Could not find '{message}' after index {previousIndex} in logs:\n{logs}");
            previousIndex = index;
        }
    }
}
