using System.Net;
using System.Text.Json;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.ProcessNextConcurrency;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollections.Pdf)]
public sealed class ProcessNextConcurrencyTests(ITestOutputHelper _output, AppFixtureClassFixture _classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task ProcessNext_WhileTransitionInFlight_ReturnsRetryingConflictWithoutSecondTransition()
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic, "process-next-concurrency");
        var fixture = fixtureScope.Fixture;
        var client = fixture.GetDirectAppClient();
        await PostScenarioEndpoint(client, "/test/process-next-concurrency/reset");

        var token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        var instance = readInstantiationResponse.Data.Model;
        Assert.NotNull(instance);

        Task<AppFixture.ApiResponse> activeProcessNext = fixture.Instances.ProcessNext(
            token,
            readInstantiationResponse
        );
        try
        {
            await PostScenarioEndpoint(client, "/test/process-next-concurrency/wait-until-task-end");
            Assert.False(activeProcessNext.IsCompleted);

            using var processingResponse = await fixture.Instances.Get(token, readInstantiationResponse);
            using var processingInstance = await processingResponse.Read<Instance>();
            Assert.Equal(ProcessStatus.Processing, processingInstance.Data.Model!.Process.Status);
            Assert.Equal("Task_1", processingInstance.Data.Model.Process.CurrentTask?.ElementId);

            using var competingResponse = await fixture.Instances.ProcessNext(token, readInstantiationResponse);
            using var conflict = await competingResponse.Read<ProblemDetails>();
            Assert.Equal(HttpStatusCode.Conflict, conflict.Response.StatusCode);

            using JsonDocument problem = JsonDocument.Parse(conflict.Data.Body!);
            JsonElement root = problem.RootElement;
            Assert.Equal((int)HttpStatusCode.Conflict, root.GetProperty("status").GetInt32());
            Assert.Equal("retrying", root.GetProperty("processNextState").GetString());
            Assert.Equal("Task is still being processed.", root.GetProperty("title").GetString());
            Assert.False(root.TryGetProperty("type", out _));
            Assert.Equal(1, await GetTaskEndInvocations(client));
        }
        finally
        {
            await PostScenarioEndpoint(client, "/test/process-next-concurrency/release-task-end");
        }

        using var activeResponse = await activeProcessNext;
        using var processState = await activeResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, processState.Response.StatusCode);
        Assert.Null(processState.Data.Model!.CurrentTask);
        Assert.Equal("EndEvent_1", processState.Data.Model.EndEvent);

        using var refreshedResponse = await fixture.Instances.Get(token, readInstantiationResponse);
        using var refreshedInstance = await refreshedResponse.Read<Instance>();
        Assert.Null(refreshedInstance.Data.Model!.Process.CurrentTask);
        Assert.Equal("EndEvent_1", refreshedInstance.Data.Model.Process.EndEvent);
        Assert.Equal(1, await GetTaskEndInvocations(client));
    }

    [Fact]
    public async Task ProcessNext_WhenCapturedSnapshotLosesAcquire_SettlesWithoutBlockingTheNextSubmission()
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic, "process-next-concurrency");
        var fixture = fixtureScope.Fixture;
        var client = fixture.GetDirectAppClient();
        await PostScenarioEndpoint(client, "/test/process-next-concurrency/reset");
        var token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instantiation = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var instance = await instantiation.Read<Instance>();
        Assert.NotNull(instance.Data.Model);
        await PostScenarioEndpoint(client, "/test/process-next-concurrency/arm-acquire");

        Task<AppFixture.ApiResponse> processNext = fixture.Instances.ProcessNext(token, instance);
        try
        {
            // The real engine has received W1 and its signed snapshot; Storage is still idle.
            await PostScenarioEndpoint(client, "/test/process-next-concurrency/wait-until-acquire");
            Assert.False(processNext.IsCompleted);
            using var attachment = await fixture.Instances.PostData(
                token,
                instance,
                "attachment",
                "Changed after capture"u8.ToArray(),
                "text/plain",
                "change.txt"
            );
            Assert.True(attachment.Response.IsSuccessStatusCode);
        }
        finally
        {
            await PostScenarioEndpoint(client, "/test/process-next-concurrency/release-acquire");
            await PostScenarioEndpoint(client, "/test/process-next-concurrency/release-task-end");
        }

        // The request waits for W1 to settle. A superseded acquire has no W2 to run or fail.
        using var superseded = await processNext;
        using var conflict = await superseded.Read<ProblemDetails>();
        Assert.Equal(HttpStatusCode.Conflict, conflict.Response.StatusCode);
        using JsonDocument problem = JsonDocument.Parse(conflict.Data.Body!);
        Assert.Equal("instanceChanged", problem.RootElement.GetProperty("processNextState").GetString());
        Assert.Equal(0, await GetTaskEndInvocations(client));

        using var refresh = await fixture.Instances.Get(token, instance);
        using var refreshed = await refresh.Read<Instance>();
        Assert.NotNull(refreshed.Data.Model);
        Assert.Equal(ProcessStatus.Idle, refreshed.Data.Model.Process.Status);
        Assert.Equal("Task_1", refreshed.Data.Model.Process.CurrentTask?.ElementId);
        Assert.Equal(instance.Data.Model.Process.CurrentTask?.Flow, refreshed.Data.Model.Process.CurrentTask?.Flow);
        Assert.Contains(refreshed.Data.Model.Data, element => element.Filename == "change.txt");

        using var retry = await fixture.Instances.ProcessNext(token, refreshed);
        using var completed = await retry.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, completed.Response.StatusCode);
        Assert.NotNull(completed.Data.Model);
        Assert.Null(completed.Data.Model.CurrentTask);
        Assert.Equal("EndEvent_1", completed.Data.Model.EndEvent);
        Assert.Equal(1, await GetTaskEndInvocations(client));
    }

    private static async Task PostScenarioEndpoint(HttpClient client, string path)
    {
        using var response = await client.PostAsync(path, null);
        response.EnsureSuccessStatusCode();
    }

    private static async Task<int> GetTaskEndInvocations(HttpClient client)
    {
        using var response = await client.GetAsync("/test/process-next-concurrency/state");
        response.EnsureSuccessStatusCode();
        using JsonDocument state = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return state.RootElement.GetProperty("taskEndInvocations").GetInt32();
    }
}
