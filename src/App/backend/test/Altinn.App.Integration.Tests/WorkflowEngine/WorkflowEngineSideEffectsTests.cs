using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

/// <summary>
/// Verifies the process-next side-effects split: non-critical post-commit commands (Altinn event
/// registrations) run in a separate <c>IsHead=false</c> workflow that never gates the ProcessNext
/// response or the next transition, while critical post-commit commands (ExecuteServiceTask) stay
/// in the Main workflow and are waited on. The scenario's events client delays every registration
/// by 10 seconds, so any response that arrives promptly demonstrably did not wait for the events.
/// </summary>
[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineSideEffectsTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private const string SideEffectsOperationIdPrefix = "Process next side-effects:";
    private static readonly Uri _engineBaseAddress = new("http://workflow-engine.local.altinn.cloud:8000");
    private static readonly TimeSpan _sideEffectsCompletionTimeout = TimeSpan.FromSeconds(120);

    [Fact]
    public async Task ProcessNext_WithEventSideEffects_DoesNotGateResponsesWhileSideEffectsStillComplete()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-side-effects"
        );
        var fixture = fixtureScope.Fixture;

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        // Instantiation triggers the initial task-start transition. With events enabled, its
        // MovedTo/InstanceCreated registrations are 10s-delayed side effects - the response can
        // only arrive promptly because they run in the non-gating side-effects workflow.
        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var readInstantiation = await instantiationResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, readInstantiation.Response.StatusCode);
        Instance instance = readInstantiation.Data.Model!;
        Assert.Equal("Task_1", instance.Process.CurrentTask!.ElementId);

        using var engineClient = new HttpClient { BaseAddress = _engineBaseAddress };
        string ns = Uri.EscapeDataString(instance.AppId);
        string collectionKey = instance.Id.Split('/')[1];

        List<EngineWorkflow> workflows = await ListWorkflows(engineClient, ns, collectionKey);
        EngineWorkflow instantiationMain = Assert.Single(workflows, w => !IsSideEffectsWorkflow(w));
        EngineWorkflow instantiationSideEffects = Assert.Single(workflows, IsSideEffectsWorkflow);

        // The transition itself settled, but its delayed side effects are still running.
        Assert.Equal("Completed", instantiationMain.OverallStatus);
        Assert.NotEqual("Completed", instantiationSideEffects.OverallStatus);

        // The side-effects workflow is invisible to the collection heads frontier.
        List<Guid> headIds = await GetCollectionHeadIds(engineClient, ns, collectionKey);
        Assert.Contains(instantiationMain.DatabaseId, headIds);
        Assert.DoesNotContain(instantiationSideEffects.DatabaseId, headIds);

        // The next transition is not blocked by the still-running side effects.
        await PatchValidFormData(fixture, token, readInstantiation);
        using var firstProcessNextResponse = await fixture.Instances.ProcessNext(token, readInstantiation);
        using var firstProcessState = await firstProcessNextResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, firstProcessState.Response.StatusCode);
        Assert.Equal("Task_Service", firstProcessState.Data.Model!.CurrentTask!.ElementId);

        // The critical ExecuteServiceTask ran (and was waited on) in the Main workflow; the
        // MovedToAltinnEvent moved to the side-effects workflow.
        workflows = await ListWorkflows(engineClient, ns, collectionKey);
        EngineWorkflow serviceTaskMain = Assert.Single(
            workflows,
            w => !IsSideEffectsWorkflow(w) && w.OperationId.EndsWith("-> Task_Service", StringComparison.Ordinal)
        );
        Assert.Equal("Completed", serviceTaskMain.OverallStatus);
        EngineStep executeServiceTaskStep = Assert.Single(
            serviceTaskMain.Steps,
            s => s.OperationId == "ExecuteServiceTask"
        );
        Assert.Equal("Completed", executeServiceTaskStep.Status);
        Assert.DoesNotContain(serviceTaskMain.Steps, s => s.OperationId == "MovedToAltinnEvent");

        EngineWorkflow serviceTaskSideEffects = Assert.Single(
            workflows,
            w => IsSideEffectsWorkflow(w) && w.OperationId.EndsWith("-> Task_Service", StringComparison.Ordinal)
        );
        Assert.Contains(serviceTaskSideEffects.Steps, s => s.OperationId == "MovedToAltinnEvent");

        // Drive the process to the end while earlier side effects may still be pending. This is
        // the core guarantee: the pipeline never waits on the side-effect chain.
        using var instanceAtServiceTaskResponse = await fixture.Instances.Get(token, readInstantiation);
        using var instanceAtServiceTask = await instanceAtServiceTaskResponse.Read<Instance>();
        using var secondProcessNextResponse = await fixture.Instances.ProcessNext(token, instanceAtServiceTask);
        using var secondProcessState = await secondProcessNextResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, secondProcessState.Response.StatusCode);
        Assert.Null(secondProcessState.Data.Model!.CurrentTask);
        Assert.Equal("EndEvent_1", secondProcessState.Data.Model.EndEvent);

        // Fire-and-forget does not mean fire-and-lose: every side-effects workflow (instantiation,
        // task transition, process end) still runs to completion.
        List<EngineWorkflow> sideEffectWorkflows = await WaitForSideEffectsWorkflowsToComplete(
            engineClient,
            ns,
            collectionKey,
            expectedCount: 3
        );
        Assert.All(sideEffectWorkflows, w => Assert.Equal("Completed", w.OverallStatus));

        // And the events were actually registered through the (delayed) events client.
        IReadOnlyList<string> registeredEventTypes = await GetRegisteredEventTypes(fixture);
        Assert.Contains("app.instance.process.movedTo.Task_1", registeredEventTypes);
        Assert.Contains("app.instance.created", registeredEventTypes);
        Assert.Contains("app.instance.process.movedTo.Task_Service", registeredEventTypes);
        Assert.Contains("app.instance.process.completed", registeredEventTypes);
    }

    private static bool IsSideEffectsWorkflow(EngineWorkflow workflow) =>
        workflow.OperationId.StartsWith(SideEffectsOperationIdPrefix, StringComparison.Ordinal);

    private static async Task<List<EngineWorkflow>> ListWorkflows(
        HttpClient engineClient,
        string ns,
        string collectionKey
    )
    {
        using var response = await engineClient.GetAsync(
            $"/api/v1/{ns}/workflows?collectionKey={Uri.EscapeDataString(collectionKey)}&pageSize=100"
        );
        if (response.StatusCode == HttpStatusCode.NoContent)
            return [];
        response.EnsureSuccessStatusCode();

        string body = await response.Content.ReadAsStringAsync();
        EnginePage page = JsonSerializer.Deserialize<EnginePage>(body)!;
        return page.Data;
    }

    private static async Task<List<Guid>> GetCollectionHeadIds(HttpClient engineClient, string ns, string collectionKey)
    {
        using var response = await engineClient.GetAsync(
            $"/api/v1/{ns}/collections/{Uri.EscapeDataString(collectionKey)}"
        );
        response.EnsureSuccessStatusCode();

        string body = await response.Content.ReadAsStringAsync();
        EngineCollection collection = JsonSerializer.Deserialize<EngineCollection>(body)!;
        return collection.Heads.Select(h => h.DatabaseId).ToList();
    }

    private static async Task<List<EngineWorkflow>> WaitForSideEffectsWorkflowsToComplete(
        HttpClient engineClient,
        string ns,
        string collectionKey,
        int expectedCount
    )
    {
        var deadline = DateTimeOffset.UtcNow + _sideEffectsCompletionTimeout;
        List<EngineWorkflow> sideEffectWorkflows = [];
        while (DateTimeOffset.UtcNow < deadline)
        {
            List<EngineWorkflow> workflows = await ListWorkflows(engineClient, ns, collectionKey);
            sideEffectWorkflows = workflows.Where(IsSideEffectsWorkflow).ToList();
            if (
                sideEffectWorkflows.Count == expectedCount
                && sideEffectWorkflows.All(w => w.OverallStatus == "Completed")
            )
            {
                return sideEffectWorkflows;
            }

            await Task.Delay(TimeSpan.FromSeconds(1));
        }

        string statuses = string.Join(", ", sideEffectWorkflows.Select(w => $"{w.OperationId}: {w.OverallStatus}"));
        Assert.Fail(
            $"Side-effects workflows did not complete within {_sideEffectsCompletionTimeout.TotalSeconds:0}s. "
                + $"Found {sideEffectWorkflows.Count}/{expectedCount}: [{statuses}]"
        );
        return sideEffectWorkflows;
    }

    private static async Task<IReadOnlyList<string>> GetRegisteredEventTypes(AppFixture fixture)
    {
        using var response = await fixture.GetDirectAppClient().GetAsync("/test/side-effects/events");
        response.EnsureSuccessStatusCode();
        string body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<List<string>>(body)!;
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

    private sealed record EnginePage([property: JsonPropertyName("data")] List<EngineWorkflow> Data);

    private sealed record EngineWorkflow(
        [property: JsonPropertyName("databaseId")] Guid DatabaseId,
        [property: JsonPropertyName("operationId")] string OperationId,
        [property: JsonPropertyName("overallStatus")] string OverallStatus,
        [property: JsonPropertyName("steps")] List<EngineStep> Steps
    );

    private sealed record EngineStep(
        [property: JsonPropertyName("operationId")] string OperationId,
        [property: JsonPropertyName("status")] string Status
    );

    private sealed record EngineCollection([property: JsonPropertyName("heads")] List<EngineHead> Heads);

    private sealed record EngineHead([property: JsonPropertyName("databaseId")] Guid DatabaseId);
}
