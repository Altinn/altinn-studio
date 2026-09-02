using System.Net;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

/// <summary>
/// The composition property the unit tests cannot span: through a real engine, a completed
/// pipeline stage never re-runs while a later part retries and defers — re-entry lands on the
/// misbehaving part and only there. The engine's step semantics (skip completed, re-execute
/// same step) and the app's expansion/dispatch are each unit-tested in isolation; this test is
/// the two of them composed.
/// </summary>
[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEnginePipelineTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task ProcessNext_MidStageRetryAndDeferral_ReEnterAtTheMisbehavingStageOnly()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-pipeline"
        );
        var fixture = fixtureScope.Fixture;
        using (
            var resetResponse = await fixture
                .GetDirectAppClient()
                .PostAsync("/test/workflow-engine-pipeline/reset", null)
        )
        {
            resetResponse.EnsureSuccessStatusCode();
        }

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var instance = await instantiationResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, instance.Response.StatusCode);
        Assert.Equal("Task_1", instance.Data.Model!.Process.CurrentTask!.ElementId);

        Guid dataElementId = Guid.Parse(instance.Data.Model.Data.Single(d => d.DataType == "model").Id);
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

        // The mid-pipeline deferral parks the workflow in Waiting, which releases the synchronous
        // process/next wait early with the ordinary success shape — so this response may show
        // either the committed service task (released while parked) or the end event (chain beat
        // the release). Both are correct; the settled state is asserted by polling below.
        try
        {
            using var processNextResponse = await fixture.Instances.ProcessNext(token, instance);
            using var processState = await processNextResponse.Read<AppProcessState>();
            Assert.Equal(HttpStatusCode.OK, processState.Response.StatusCode);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            using var engineClient = new HttpClient
            {
                BaseAddress = new Uri("http://workflow-engine.local.altinn.cloud:8000"),
            };
            string ns = Uri.EscapeDataString(instance.Data.Model.AppId);
            string collectionKey = instance.Data.Model.Id.Split('/')[1];
            string engineState = "(engine query failed)";
            try
            {
                using var engineResponse = await engineClient.GetAsync(
                    $"/api/v1/{ns}/workflows?collectionKey={Uri.EscapeDataString(collectionKey)}&pageSize=100"
                );
                engineState = $"{engineResponse.StatusCode}: {await engineResponse.Content.ReadAsStringAsync()}";
            }
            catch (Exception engineEx)
            {
                engineState = engineEx.ToString();
            }

            string appLogs = await fixture.GetAppLogs();
            Assert.Fail(
                $"ProcessNext failed: {ex.Message}\n----- ENGINE STATE -----\n{engineState}\n----- APP LOGS -----\n{appLogs}"
            );
        }

        await WaitForProcessEnd(fixture, token, instance);

        string logs = await fixture.GetSnapshotAppLogs();

        // The exact journey: part 1 completes once; part 2 fails, defers, then completes — the
        // engine re-enters at part 2 both times; part 3 concludes once.
        AssertInOrder(
            logs,
            "Pipeline.ReserveResources.Run1.Completed",
            "Pipeline.DispatchOrder.Run1.FailedRetryable",
            "Pipeline.DispatchOrder.Run2.Defer",
            "Pipeline.DispatchOrder.Run3.Completed",
            "Pipeline.ConfirmOrder.Run1.Success"
        );

        // The core claim: neither the completed stage nor the conclusion ever ran again, and the
        // misbehaving stage ran exactly three times.
        Assert.DoesNotContain("Pipeline.ReserveResources.Run2", logs);
        Assert.DoesNotContain("Pipeline.DispatchOrder.Run4", logs);
        Assert.DoesNotContain("Pipeline.ConfirmOrder.Run2", logs);
    }

    private static async Task WaitForProcessEnd(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        DateTimeOffset deadline = DateTimeOffset.UtcNow + TimeSpan.FromSeconds(60);
        string? lastSeenTask = null;
        while (DateTimeOffset.UtcNow < deadline)
        {
            using var refreshedResponse = await fixture.Instances.Get(token, instance);
            using var refreshed = await refreshedResponse.Read<Instance>();
            if (refreshed.Data.Model?.Process?.EndEvent == "EndEvent_1")
            {
                return;
            }

            lastSeenTask = refreshed.Data.Model?.Process?.CurrentTask?.ElementId;
            await Task.Delay(TimeSpan.FromMilliseconds(500));
        }

        Assert.Fail($"Process did not reach EndEvent_1 within the deadline (last seen task: {lastSeenTask}).");
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
