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
/// Verifies the process-next primary/auxiliary split: auxiliary post-commit commands (Altinn event
/// registrations) each run in their own single-step auxiliary workflow (<c>IsHead=false</c>) that
/// never gates the ProcessNext response or the next transition, while primary post-commit
/// commands (ExecuteServiceTask) stay in the primary workflow and are waited on. The scenario's
/// events client holds registrations until the test releases them, proving that the process
/// completes while its auxiliary workflows are still pending.
///
/// It also closes the idempotency chain: every registration must carry the engine's id for the step
/// that raised it, so a step the engine retries presents Altinn Events the same <c>Idempotency-Key</c>
/// and the event is stored and delivered once. The engine reports that same id as the step's
/// <c>databaseId</c>, which is what the key is matched against here.
/// </summary>
[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineAuxiliaryWorkflowsTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private const string AuxiliaryOperationIdPrefix = "Process next auxiliary:";

    // Keep in sync with StudioctlEnvironment.WaitForEngineReady - the engine's host-exposed address.
    private static readonly Uri _engineBaseAddress = new("http://workflow-engine.local.altinn.cloud:8000");
    private static readonly TimeSpan _auxiliaryCompletionTimeout = TimeSpan.FromSeconds(120);

    [Fact]
    public async Task ProcessNext_WithEventRegistrations_DoesNotGateResponsesWhileAuxiliaryWorkflowsStillComplete()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-auxiliary-workflows"
        );
        var fixture = fixtureScope.Fixture;

        try
        {
            string token = await fixture.Auth.GetUserToken(userId: 1337);

            // Instantiation triggers the initial task-start transition. With events enabled, its
            // MovedTo/InstanceCreated registrations remain held until the test releases them,
            // while the response must arrive without waiting for those auxiliary workflows.
            using var instantiationResponse = await fixture.Instances.PostSimplified(
                token,
                new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
            );
            using var readInstantiation = await instantiationResponse.Read<Instance>();
            Assert.Equal(HttpStatusCode.Created, readInstantiation.Response.StatusCode);
            Instance instance = readInstantiation.Data.Model!;
            Assert.Equal("Task_1", instance.Process.CurrentTask!.ElementId);

            using var engineClient = new HttpClient { BaseAddress = _engineBaseAddress };
            string ns = Uri.EscapeDataString(instance.AppId);
            string collectionKey = instance.Id.Split('/')[1];

            List<EngineWorkflow> workflows = await ListWorkflows(engineClient, ns, collectionKey);
            EngineWorkflow instantiationPrimary = Assert.Single(workflows, w => !IsAuxiliaryWorkflow(w));
            // One single-step auxiliary workflow per command: MovedTo + InstanceCreated.
            List<EngineWorkflow> instantiationAuxiliary = workflows.Where(IsAuxiliaryWorkflow).ToList();
            Assert.Equal(2, instantiationAuxiliary.Count);

            // The transition completed while its event registrations remain held by the test.
            Assert.Equal("Completed", instantiationPrimary.OverallStatus);
            Assert.All(instantiationAuxiliary, w => Assert.NotEqual("Completed", w.OverallStatus));

            // Auxiliary workflows never become collection heads.
            List<Guid> headIds = await GetCollectionHeadIds(engineClient, ns, collectionKey);
            Assert.Contains(instantiationPrimary.DatabaseId, headIds);
            Assert.All(instantiationAuxiliary, w => Assert.DoesNotContain(w.DatabaseId, headIds));

            // The next transition is not blocked by the still-running auxiliary workflows.
            await PatchValidFormData(fixture, token, readInstantiation);
            using var firstProcessNextResponse = await fixture.Instances.ProcessNext(token, readInstantiation);
            using var firstProcessState = await firstProcessNextResponse.Read<AppProcessState>();
            Assert.Equal(HttpStatusCode.OK, firstProcessState.Response.StatusCode);
            Assert.Null(firstProcessState.Data.Model!.CurrentTask);
            Assert.Equal("EndEvent_1", firstProcessState.Data.Model.EndEvent);

            // The primary ExecuteServiceTask ran (and was waited on) in the primary workflow; the
            // MovedToAltinnEvent moved to its own auxiliary workflow.
            workflows = await ListWorkflows(engineClient, ns, collectionKey);
            EngineWorkflow serviceTaskPrimary = Assert.Single(
                workflows,
                w => !IsAuxiliaryWorkflow(w) && w.OperationId.EndsWith("-> Task_Service", StringComparison.Ordinal)
            );
            Assert.Equal("Completed", serviceTaskPrimary.OverallStatus);
            EngineWorkflow acquireWorkflow = Assert.Single(
                workflows,
                w => w.OperationId == "Process next: Mark instance as processing"
            );
            Assert.Equal("Completed", acquireWorkflow.OverallStatus);
            Assert.Equal("AcquireProcessingStatus", Assert.Single(acquireWorkflow.Steps).OperationId);
            Assert.DoesNotContain(serviceTaskPrimary.Steps, s => s.OperationId == "AcquireProcessingStatus");
            // A simple IServiceTask's pipeline is its conclusion and nothing else, so its one step names item 0.
            EngineStep executeServiceTaskStep = Assert.Single(
                serviceTaskPrimary.Steps,
                s => s.OperationId == "ExecuteServiceTask: 0"
            );
            Assert.Equal("Completed", executeServiceTaskStep.Status);
            Assert.DoesNotContain(serviceTaskPrimary.Steps, s => s.OperationId == "MovedToAltinnEvent");

            EngineWorkflow serviceTaskAuxiliary = Assert.Single(
                workflows,
                w => IsAuxiliaryWorkflow(w) && w.OperationId.Contains("-> Task_Service", StringComparison.Ordinal)
            );
            EngineStep movedToStep = Assert.Single(serviceTaskAuxiliary.Steps);
            Assert.Equal("MovedToAltinnEvent", movedToStep.OperationId);
            // The auxiliary workflow's OperationId names its single command, so listings stay legible.
            Assert.EndsWith("· MovedToAltinnEvent", serviceTaskAuxiliary.OperationId, StringComparison.Ordinal);

            // The service task and the transition to the end completed while the event
            // registrations are still running. Process transitions must not wait on those siblings.
            Assert.NotEqual("Completed", serviceTaskAuxiliary.OverallStatus);
            EngineWorkflow endPrimary = Assert.Single(
                workflows,
                w => !IsAuxiliaryWorkflow(w) && w.OperationId.EndsWith("-> EndEvent_1", StringComparison.Ordinal)
            );
            Assert.Equal("Completed", endPrimary.OverallStatus);

            Assert.Empty(await GetRegisteredEvents(fixture));
            await ReleaseEvents(fixture);

            // Not waited on does not mean lost: every auxiliary workflow still runs to completion.
            // One auxiliary workflow per command: MovedTo.Task_1 + InstanceCreated (instantiation),
            // MovedTo.Task_Service (task transition), Completed (process end).
            List<EngineWorkflow> auxiliaryWorkflows = await WaitForAuxiliaryWorkflowsToComplete(
                engineClient,
                ns,
                collectionKey,
                expectedCount: 4
            );
            Assert.All(auxiliaryWorkflows, w => Assert.Equal("Completed", w.OverallStatus));

            // Releasing the gate lets each pending event registration complete.
            IReadOnlyList<RegisteredEvent> registeredEvents = await GetRegisteredEvents(fixture);
            List<string> registeredEventTypes = registeredEvents.Select(e => e.EventType).ToList();
            Assert.Contains("app.instance.process.movedTo.Task_1", registeredEventTypes);
            Assert.Contains("app.instance.created", registeredEventTypes);
            Assert.Contains("app.instance.process.movedTo.Task_Service", registeredEventTypes);
            Assert.Contains("app.instance.process.completed", registeredEventTypes);

            // Every registration carries an idempotency key, and each names its own step: a key shared
            // by two events would have Altinn Events discard the second as a duplicate of the first.
            Assert.All(registeredEvents, e => Assert.False(string.IsNullOrEmpty(e.IdempotencyKey)));
            Assert.Equal(
                registeredEvents.Count,
                registeredEvents.Select(e => e.IdempotencyKey).Distinct(StringComparer.Ordinal).Count()
            );

            // The key is the engine's own id for the step that raised the event, which is what makes it
            // stable across that step's retries. Matched against the step captured before the release.
            RegisteredEvent movedToServiceTask = Assert.Single(
                registeredEvents,
                e => e.EventType == "app.instance.process.movedTo.Task_Service"
            );
            Assert.Equal(movedToStep.DatabaseId.ToString(), movedToServiceTask.IdempotencyKey);
        }
        finally
        {
            // Release pending callbacks even when an assertion fails. Releasing twice is harmless.
            await ReleaseEvents(fixture);
        }
    }

    private static bool IsAuxiliaryWorkflow(EngineWorkflow workflow) =>
        workflow.OperationId.StartsWith(AuxiliaryOperationIdPrefix, StringComparison.Ordinal);

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

    private static async Task<List<EngineWorkflow>> WaitForAuxiliaryWorkflowsToComplete(
        HttpClient engineClient,
        string ns,
        string collectionKey,
        int expectedCount
    )
    {
        var deadline = DateTimeOffset.UtcNow + _auxiliaryCompletionTimeout;
        List<EngineWorkflow> auxiliaryWorkflows = [];
        while (DateTimeOffset.UtcNow < deadline)
        {
            List<EngineWorkflow> workflows = await ListWorkflows(engineClient, ns, collectionKey);
            auxiliaryWorkflows = workflows.Where(IsAuxiliaryWorkflow).ToList();
            if (
                auxiliaryWorkflows.Count == expectedCount
                && auxiliaryWorkflows.All(w => w.OverallStatus == "Completed")
            )
            {
                return auxiliaryWorkflows;
            }

            await Task.Delay(TimeSpan.FromSeconds(1));
        }

        string statuses = string.Join(", ", auxiliaryWorkflows.Select(w => $"{w.OperationId}: {w.OverallStatus}"));
        Assert.Fail(
            $"Auxiliary workflows did not complete within {_auxiliaryCompletionTimeout.TotalSeconds:0}s. "
                + $"Found {auxiliaryWorkflows.Count}/{expectedCount}: [{statuses}]"
        );
        return auxiliaryWorkflows;
    }

    private static async Task ReleaseEvents(AppFixture fixture)
    {
        using var response = await fixture.GetDirectAppClient().PostAsync("/test/auxiliary-workflows/release", null);
        response.EnsureSuccessStatusCode();
    }

    private static async Task<IReadOnlyList<RegisteredEvent>> GetRegisteredEvents(AppFixture fixture)
    {
        using var response = await fixture.GetDirectAppClient().GetAsync("/test/auxiliary-workflows/events");
        response.EnsureSuccessStatusCode();
        string body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<List<RegisteredEvent>>(body)!;
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
        [property: JsonPropertyName("databaseId")] Guid DatabaseId,
        [property: JsonPropertyName("operationId")] string OperationId,
        [property: JsonPropertyName("status")] string Status
    );

    /// <summary>One event registration as the scenario's events client saw it.</summary>
    private sealed record RegisteredEvent(
        [property: JsonPropertyName("eventType")] string EventType,
        [property: JsonPropertyName("idempotencyKey")] string? IdempotencyKey
    );

    private sealed record EngineCollection([property: JsonPropertyName("heads")] List<EngineHead> Heads);

    private sealed record EngineHead([property: JsonPropertyName("databaseId")] Guid DatabaseId);
}
