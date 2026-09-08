using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineCommandTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task CustomerCommands_RunFromNonfriendAssembly_WithScopedFactoriesAndServiceLifecycles()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.WorkflowCommands);
        var fixture = fixtureScope.Fixture;
        await Reset(fixture, "once");
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await Create(fixture, token);
        using var enter = await fixture.Instances.ProcessNext(token, instance);
        using var entered = await enter.Read<AppProcessState>();
        Assert.True(entered.Response.IsSuccessStatusCode, entered.Data.Body);
        Assert.Equal("Task_Custom", entered.Data.Model!.CurrentTask!.ElementId);

        var initial = await State(fixture);
        Assert.Equal("WorkflowCommandCustomer", initial.AssemblyName);
        Assert.Equal(["first", "second", "second", "optional"], initial.Observations.Select(x => x.Phase));
        Assert.Equal(["completed", "retryable", "completed", "completed"], initial.Observations.Select(x => x.Outcome));
        var second = initial.Observations.Where(x => x.Phase == "second").ToArray();
        Assert.Single(second.Select(x => x.StepId).Distinct());
        Assert.NotEqual(initial.Observations[0].StepId, second[0].StepId);
        Assert.All(second, x => Assert.Equal(["Task_Custom/first"], x.PriorPhases));
        Assert.Equal(4, initial.Observations.Select(x => x.ScopeId).Distinct().Count());
        Assert.All(initial.Observations, x => Assert.Contains(x.ScopeId, initial.DisposedScopes));

        using var leave = await fixture.Instances.ProcessNext(token, instance);
        using var left = await leave.Read<AppProcessState>();
        Assert.True(left.Response.IsSuccessStatusCode, left.Data.Body);
        await WaitForEnd(fixture, token, instance);
        var completed = await State(fixture);
        Assert.Equal(
            [
                "first",
                "second",
                "second",
                "optional",
                "end",
                "start",
                "simple-body",
                "end",
                "start",
                "pipeline-stage",
                "pipeline-finish",
                "end",
            ],
            completed.Observations.Select(x => x.Phase)
        );
        Assert.Contains(completed.Observations, x => x.TaskId == "Task_Simple" && x.Phase == "simple-body");
        Assert.Contains(completed.Observations, x => x.TaskId == "Task_Pipeline" && x.Phase == "pipeline-finish");
        var stored = await ReadStoredCommands(fixture, instance);
        Assert.Equal(["first", "second", "end", "start", "end", "start", "end"], stored.Select(x => x.Phase));
        Assert.Equal(stored.Length, stored.Select(x => x.StepId).Distinct().Count());
    }

    [Fact]
    public async Task Resume_PersistedCommandSurvivesConditionalOmission_WithoutRepeatingCompletedWork()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.WorkflowCommands);
        var fixture = fixtureScope.Fixture;
        await Reset(fixture, "always");
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await Create(fixture, token);
        using var enter = await fixture.Instances.ProcessNext(token, instance);
        using var failure = await enter.Read<JsonElement>();
        Assert.Equal(HttpStatusCode.InternalServerError, failure.Response.StatusCode);
        Guid workflowId = failure.Data.Model.GetProperty("workflowFailure").GetProperty("workflowId").GetGuid();
        var failed = await State(fixture);
        Assert.Single(failed.Observations, x => x.Phase == "first");
        var attempts = failed.Observations.Where(x => x.Phase == "second").ToArray();
        Assert.Equal(3, attempts.Length);
        Guid stepId = Assert.Single(attempts.Select(x => x.StepId).Distinct());
        Assert.All(attempts, x => Assert.Equal(workflowId, x.WorkflowId));
        Assert.Equal(["first"], (await ReadStoredCommands(fixture, instance)).Select(x => x.Phase));

        using var allow = await fixture
            .GetDirectAppClient()
            .PostAsync("/test/commands/allow?selectCommands=false", null);
        allow.EnsureSuccessStatusCode();
        using var resume = await fixture.Instances.ResumeCurrentTask(token, instance);
        using var resumed = await resume.Read<AppProcessState>();
        Assert.True(resumed.Response.IsSuccessStatusCode, resumed.Data.Body);
        Assert.Equal("Task_Custom", resumed.Data.Model!.CurrentTask!.ElementId);
        var after = await State(fixture);
        Assert.False(after.SelectCommands);
        Assert.Single(after.Observations, x => x.Phase == "first");
        var finalAttempt = after.Observations.Last(x => x.Phase == "second");
        Assert.Equal(stepId, finalAttempt.StepId);
        Assert.Equal(workflowId, finalAttempt.WorkflowId);
        Assert.Equal("completed", finalAttempt.Outcome);
        Assert.Equal(4, finalAttempt.Attempt);
        Assert.Single(after.Observations, x => x.Phase == "optional");
        Assert.Equal(["first", "second"], (await ReadStoredCommands(fixture, instance)).Select(x => x.Phase));
    }

    private static async Task Reset(AppFixture fixture, string failureMode)
    {
        using var response = await fixture
            .GetDirectAppClient()
            .PostAsJsonAsync("/test/commands/reset", new { failureMode, selectCommands = true });
        response.EnsureSuccessStatusCode();
    }

    private static async Task<CommandState> State(AppFixture fixture) =>
        await fixture.GetDirectAppClient().GetFromJsonAsync<CommandState>("/test/commands/state")
        ?? throw new InvalidOperationException("Missing command observations.");

    private static async Task<AppFixture.ReadApiResponse<Instance>> Create(AppFixture fixture, string token)
    {
        using var response = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        var instance = await response.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, instance.Response.StatusCode);
        return instance;
    }

    private static async Task<StoredCommand[]> ReadStoredCommands(
        AppFixture fixture,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        string owner = await fixture.Auth.GetServiceOwnerToken();
        using var response = await fixture.Instances.Get(owner, instance);
        using var current = await response.Read<Instance>();
        Assert.True(current.Response.IsSuccessStatusCode, current.Data.Body);
        var log = Assert.Single(current.Data.Model!.Data, x => x.DataType == "command-log");
        string endpoint = $"/ttd/{fixture.App}/instances/{current.Data.Model.Id}/data/{log.Id}";
        using var dataResponse = await fixture.Generic.Get(endpoint, owner);
        using var data = await dataResponse.Read<StoredCommand[]>();
        Assert.True(
            data.Response.IsSuccessStatusCode,
            $"GET {endpoint} returned {(int)data.Response.StatusCode} {data.Response.StatusCode}: {data.Data.Body}"
        );
        return data.Data.Model!;
    }

    private static async Task WaitForEnd(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        for (int attempt = 0; attempt < 120; attempt++)
        {
            using var response = await fixture.Instances.Get(token, instance);
            using var current = await response.Read<Instance>();
            if (current.Data.Model?.Process.EndEvent == "EndEvent_1")
                return;
            await Task.Delay(250);
        }
        Assert.Fail("Customer service tasks did not finish within 30 seconds.");
    }

    private sealed record CommandState(
        CommandObservation[] Observations,
        Guid[] DisposedScopes,
        bool SelectCommands,
        string AssemblyName
    );

    private sealed record CommandObservation(
        string TaskId,
        string Phase,
        string Value,
        Guid WorkflowId,
        Guid StepId,
        Guid ScopeId,
        int Attempt,
        string[] PriorPhases,
        string Outcome
    );

    private sealed record StoredCommand(string TaskId, string Phase, string Value, Guid StepId);
}
