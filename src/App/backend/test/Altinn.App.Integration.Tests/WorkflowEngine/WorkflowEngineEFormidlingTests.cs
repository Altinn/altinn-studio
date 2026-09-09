using System.Diagnostics;
using System.Net;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.App.Core.EFormidling;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

/// <summary>
/// The eFormidling delivery wait, composed against a real engine: the shipment is dispatched once,
/// the concluding step defers while the integrasjonspunkt has nothing to report, and the process
/// advances only when delivery is confirmed. The classification, the backoff ladder and the
/// pipeline's expansion are unit-tested in isolation — what this adds is that the send survives two
/// real parks without being repeated, which is the whole reason the send has its own stage.
/// </summary>
[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineEFormidlingTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task ProcessNext_EFormidlingTask_WaitsForDelivery_AndSendsTheShipmentOnce()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic, scenario: "eformidling-pipeline");
        var fixture = fixtureScope.Fixture;
        using (
            var resetResponse = await fixture.GetDirectAppClient().PostAsync("/test/eformidling-pipeline/reset", null)
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

        // The delivery wait parks the workflow in Waiting, which releases the synchronous
        // process/next early with the ordinary success shape — so this response may show either the
        // committed eFormidling task (released while parked) or the end event (delivery confirmed
        // before the release). Both are correct; the settled state is asserted by polling below.
        try
        {
            using var processNextResponse = await fixture.Instances.ProcessNext(token, instance);
            using var processState = await processNextResponse.Read<AppProcessState>();
            Assert.Equal(HttpStatusCode.OK, processState.Response.StatusCode);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            await FailWithEngineState(fixture, instance, ex);
        }

        Instance settled = await WaitForProcessEnd(fixture, token, instance);

        string logs = await fixture.GetSnapshotAppLogs();

        // The exact journey: send once, then a check per poll until delivery is confirmed.
        AssertInOrder(
            logs,
            "EFormidling.Send.Run1",
            "EFormidling.Status.Run1.Pending.opprettet",
            "EFormidling.Status.Run2.Pending.sendt",
            "EFormidling.Status.Run3.Delivered.levert"
        );

        // The core claim. Two deferrals re-executed the concluding step twice, and neither re-ran the
        // send: the engine records the send stage as completed, so re-entry lands past it. A single
        // deferring task would have re-sent the shipment on every poll.
        Assert.DoesNotContain("EFormidling.Send.Run2", logs);
        Assert.DoesNotContain("EFormidling.Status.Run4", logs);

        // The terminal status is recorded on the instance, so what became of the shipment outlives
        // the transition that waited for it.
        Assert.NotNull(settled.DataValues);
        Assert.Equal("levert", settled.DataValues[EformidlingConstants.ShipmentStatusDataValueKey]);

        // The service owner has what it needed from this instance.
        Assert.NotNull(settled.CompleteConfirmations);
        Assert.NotEmpty(settled.CompleteConfirmations);
    }

    private static async Task<Instance> WaitForProcessEnd(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        // Generous: the wait itself costs two of the task's own backoffs before delivery is
        // confirmed, on top of the engine's scheduling.
        DateTimeOffset deadline = DateTimeOffset.UtcNow + TimeSpan.FromSeconds(150);
        string? lastSeenTask = null;
        while (DateTimeOffset.UtcNow < deadline)
        {
            using var refreshedResponse = await fixture.Instances.Get(token, instance);
            using var refreshed = await refreshedResponse.Read<Instance>();
            if (refreshed.Data.Model?.Process?.EndEvent == "EndEvent_1")
            {
                return refreshed.Data.Model;
            }

            lastSeenTask = refreshed.Data.Model?.Process?.CurrentTask?.ElementId;
            await Task.Delay(TimeSpan.FromMilliseconds(500));
        }

        string logs = await fixture.GetSnapshotAppLogs();
        Assert.Fail(
            $"Process did not reach EndEvent_1 within the deadline (last seen task: {lastSeenTask}).\n"
                + $"----- SNAPSHOT LOGS -----\n{logs}"
        );
        throw new UnreachableException();
    }

    /// <summary>
    /// Dumps the engine's own view of the instance's workflows alongside the app logs. Worth keeping:
    /// this is what turned an inscrutable client timeout into a named bug when the pipeline's stage
    /// names first went over the wire.
    /// </summary>
    private static async Task FailWithEngineState(
        AppFixture fixture,
        AppFixture.ReadApiResponse<Instance> instance,
        Exception ex
    )
    {
        using var engineClient = new HttpClient
        {
            BaseAddress = new Uri("http://workflow-engine.local.altinn.cloud:8000"),
        };
        string ns = Uri.EscapeDataString(instance.Data.Model!.AppId);
        string collectionKey = instance.Data.Model.Id.Split('/')[1];
        string engineState;
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
