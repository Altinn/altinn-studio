using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Microsoft.AspNetCore.Mvc;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineHooksTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task ProcessNext_SuccessfulWorkflow_InvokesHooksAndWaitsForAutoContinuedServiceTask()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-hooks"
        );
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture);

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using AppFixture.ReadApiResponse<Instance> instance = await CreateInstance(fixture, token);
        await PatchValidFormData(fixture, token, instance);

        using var processNextResponse = await fixture.Instances.ProcessNext(token, instance);
        using var processState = await processNextResponse.Read<AppProcessState>();

        Assert.Equal(HttpStatusCode.OK, processState.Response.StatusCode);
        Assert.Null(processState.Data.Model!.CurrentTask);
        Assert.Equal("EndEvent_1", processState.Data.Model.EndEvent);

        using var refreshedInstanceResponse = await fixture.Instances.Get(token, instance);
        using var refreshedInstance = await refreshedInstanceResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.OK, refreshedInstance.Response.StatusCode);
        Assert.Null(refreshedInstance.Data.Model!.Process.CurrentTask);
        Assert.Equal("EndEvent_1", refreshedInstance.Data.Model.Process.EndEvent);

        string logs = await fixture.GetSnapshotAppLogs();
        AssertInOrder(
            logs,
            "WorkflowEngineHooks.OnTaskStarting.Task_1",
            "WorkflowEngineHooks.OnTaskEnding.Task_1.Success",
            "WorkflowEngineHooks.OnTaskStarting.Task_Service",
            "WorkflowEngineHooks.IServiceTask.Execute.Success",
            "WorkflowEngineHooks.OnTaskEnding.Task_Service",
            "WorkflowEngineHooks.OnProcessEnding"
        );
    }

    [Fact]
    public async Task ResumeCurrentTask_AfterTaskEndingHookFailure_ResumesWorkflowAndCompletesDependents()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-hooks"
        );
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture);
        await PostScenarioEndpoint(fixture, "/test/workflow-engine-hooks/fail-task-ending");

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
            "OnTaskEndingHook",
            failureRoot.GetProperty("workflowFailure").GetProperty("stepOperationId").GetString()
        );
        Assert.Contains(
            "Scenario task ending failed permanently.",
            failureRoot.GetProperty("workflowFailure").GetProperty("lastError").GetProperty("message").GetString()
        );
        using var instanceAfterFailureResponse = await fixture.Instances.Get(token, instance);
        using var instanceAfterFailure = await instanceAfterFailureResponse.Read<Instance>();
        Assert.Equal("Task_1", instanceAfterFailure.Data.Model!.Process.CurrentTask!.ElementId);

        using var blockedProcessNextResponse = await fixture.Instances.ProcessNext(token, instanceAfterFailure);
        using var blockedProcessNext = await blockedProcessNextResponse.Read<ProblemDetails>();
        Assert.Equal(HttpStatusCode.Conflict, blockedProcessNext.Response.StatusCode);
        using JsonDocument blockedDocument = JsonDocument.Parse(blockedProcessNext.Data.Body!);
        Assert.Equal("resumeRequired", blockedDocument.RootElement.GetProperty("processNextState").GetString());

        await PostScenarioEndpoint(fixture, "/test/workflow-engine-hooks/allow-task-ending");

        using var resumeResponse = await fixture.Instances.ResumeCurrentTask(token, instanceAfterFailure);
        using var resumedProcessState = await resumeResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, resumedProcessState.Response.StatusCode);
        Assert.Null(resumedProcessState.Data.Model!.CurrentTask);
        Assert.Equal("EndEvent_1", resumedProcessState.Data.Model.EndEvent);

        using var refreshedInstanceResponse = await fixture.Instances.Get(token, instanceAfterFailure);
        using var refreshedInstance = await refreshedInstanceResponse.Read<Instance>();
        Assert.Null(refreshedInstance.Data.Model!.Process.CurrentTask);
        Assert.Equal("EndEvent_1", refreshedInstance.Data.Model.Process.EndEvent);

        string logs = await fixture.GetSnapshotAppLogs();
        AssertInOrder(
            logs,
            "WorkflowEngineHooks.OnTaskStarting.Task_1",
            "WorkflowEngineHooks.OnTaskEnding.Task_1.Failed",
            "WorkflowEngineHooks.OnTaskEnding.Task_1.Success",
            "WorkflowEngineHooks.OnTaskStarting.Task_Service",
            "WorkflowEngineHooks.IServiceTask.Execute.Success",
            "WorkflowEngineHooks.OnTaskEnding.Task_Service",
            "WorkflowEngineHooks.OnProcessEnding"
        );
    }

    [Fact]
    public async Task ProcessNext_Reject_InvokesAbandonHookInsteadOfTaskEndingHook()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-hooks"
        );
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture);

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using AppFixture.ReadApiResponse<Instance> instance = await CreateInstance(fixture, token);

        using var processNextResponse = await fixture.Instances.ProcessNext(
            token,
            instance,
            new ProcessNext { Action = "reject" }
        );
        using var processState = await processNextResponse.Read<AppProcessState>();

        Assert.Equal(HttpStatusCode.OK, processState.Response.StatusCode);
        Assert.Null(processState.Data.Model!.CurrentTask);
        Assert.Equal("EndEvent_1", processState.Data.Model.EndEvent);

        string logs = await fixture.GetSnapshotAppLogs();
        AssertInOrder(
            logs,
            "WorkflowEngineHooks.OnTaskStarting.Task_1",
            "WorkflowEngineHooks.OnTaskAbandon.Task_1",
            "WorkflowEngineHooks.OnTaskStarting.Task_Service",
            "WorkflowEngineHooks.IServiceTask.Execute.Success",
            "WorkflowEngineHooks.OnTaskEnding.Task_Service",
            "WorkflowEngineHooks.OnProcessEnding"
        );
        Assert.DoesNotContain("WorkflowEngineHooks.OnTaskEnding.Task_1.Success", logs);
        Assert.DoesNotContain("WorkflowEngineHooks.OnTaskEnding.Task_1.Failed", logs);
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
    }

    private static async Task ResetScenario(AppFixture fixture)
    {
        await PostScenarioEndpoint(fixture, "/test/workflow-engine-hooks/reset");
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
