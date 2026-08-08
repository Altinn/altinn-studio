using System.Net;
using System.Text.Json;
using Altinn.App.Api.Models;
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
    public async Task ProcessNext_WhileAuthoritativeStatusIsProcessing_ReturnsGuardConflictWithoutSecondTransition()
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic, "process-next-concurrency");
        var fixture = fixtureScope.Fixture;
        var client = fixture.GetDirectAppClient();
        await PostScenarioEndpoint(client, "/test/process-next-concurrency/reset");

        var token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
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
            Assert.Equal("instance-processing", root.GetProperty("type").GetString());
            Assert.Equal((int)HttpStatusCode.Conflict, root.GetProperty("status").GetInt32());
            Assert.Equal("processing", root.GetProperty("processStatus").GetString());
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
