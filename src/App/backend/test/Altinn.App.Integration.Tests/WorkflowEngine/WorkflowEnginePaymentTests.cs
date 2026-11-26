using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

/// <summary>
/// A payment attempt through a real workflow engine: <c>pay</c> opens the attempt and the engine holds its receiver
/// until a message arrives. The scenario pays with the app library's fake processor, which reports every payment
/// as paid, so the first check or cancel finds it paid and moves the process on.
/// </summary>
[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEnginePaymentTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private static readonly TimeSpan _attemptTimeout = TimeSpan.FromSeconds(90);

    [Theory]
    [InlineData("check")]
    [InlineData("cancel")]
    public async Task PaymentAttempt_OpensOnPay_AndAMessageThatFindsThePaymentPaid_MovesTheProcessOn(string message)
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-payment"
        );
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await StartOnThePaymentTask(fixture, token);
        string instanceUrl = $"/ttd/{fixture.App}/instances/{instance.Data.Model!.Id}";

        using var pay = await fixture.Generic.Post(
            $"{instanceUrl}/actions?language=nb",
            token,
            new StringContent("""{"action":"pay"}""", MediaTypeHeaderValue.Parse("application/json"))
        );
        Assert.True(
            pay.Response.IsSuccessStatusCode,
            $"pay answered {(int)pay.Response.StatusCode}: {await pay.Response.Content.ReadAsStringAsync()}\n"
                + $"----- APP LOGS -----\n{await fixture.GetAppLogs()}"
        );
        JsonObject held = await ReadJson(await fixture.Generic.Get($"{instanceUrl}/process", token));
        Assert.Equal("processing", held["workflow"]?["status"]?.GetValue<string>());
        Assert.True(held["workflow"]?["awaitingMessages"]?.GetValue<bool>());
        JsonObject record = await ReadJson(await fixture.Generic.Get($"{instanceUrl}/payment", token));
        Assert.Equal("Created", record["status"]?.GetValue<string>());
        Assert.NotNull(record["mailboxId"]);

        using var sent = await fixture.Generic.Post(
            $"{instanceUrl}/payment/{message}?language=nb",
            token,
            new StringContent("")
        );

        Assert.True(
            sent.Response.StatusCode == HttpStatusCode.OK,
            $"{message} answered {(int)sent.Response.StatusCode}: {await sent.Response.Content.ReadAsStringAsync()}\n"
                + $"----- APP LOGS -----\n{await fixture.GetAppLogs()}"
        );
        Assert.Equal("Paid", (await ReadJson(sent))["status"]?.GetValue<string>());
        await WaitForProcessEnd(fixture, token, instance);
    }

    // The app answers the callback of the step that handles the check with a 500 after the step saved and relayed, so
    // the engine runs the step again from the same state. That run ends as the first one did.
    [Fact]
    public async Task PaymentAttempt_WhoseMessageStepRunsAgainAfterItsSaveCommitted_MovesTheProcessOnOnce()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-payment"
        );
        var fixture = fixtureScope.Fixture;
        HttpClient scenario = fixture.GetDirectAppClient();
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await StartOnThePaymentTask(fixture, token);
        string instanceUrl = $"/ttd/{fixture.App}/instances/{instance.Data.Model!.Id}";
        using var pay = await fixture.Generic.Post(
            $"{instanceUrl}/actions?language=nb",
            token,
            new StringContent("""{"action":"pay"}""", MediaTypeHeaderValue.Parse("application/json"))
        );
        Assert.True(pay.Response.IsSuccessStatusCode, $"pay answered {(int)pay.Response.StatusCode}");
        using (var arm = await scenario.PostAsync("/test/workflow-engine-payment/lose-next-receiver-answer", null))
        {
            arm.EnsureSuccessStatusCode();
        }

        using var check = await fixture.Generic.Post(
            $"{instanceUrl}/payment/check?language=nb",
            token,
            new StringContent("")
        );

        Assert.True(
            check.Response.StatusCode == HttpStatusCode.OK,
            $"check answered {(int)check.Response.StatusCode}: {await check.Response.Content.ReadAsStringAsync()}\n"
                + $"----- APP LOGS -----\n{await fixture.GetAppLogs()}"
        );
        Assert.Equal("Paid", (await ReadJson(check))["status"]?.GetValue<string>());
        await WaitForProcessEnd(fixture, token, instance);
        using (var state = await scenario.GetAsync("/test/workflow-engine-payment/state"))
        {
            JsonObject runs = JsonNode.Parse(await state.Content.ReadAsStringAsync())!.AsObject();
            Assert.Equal(2, runs["receiverRuns"]?.GetValue<int>());
        }
        using var endedResponse = await fixture.Instances.Get(token, instance);
        using var ended = await endedResponse.Read<Instance>();
        Assert.Single(ended.Data.Model!.Data, dataElement => dataElement.DataType == "paymentReceiptPdf");
    }

    [Fact]
    public async Task ProcessNext_ConfirmOnThePaymentTask_IsRefusedAsNotCompleted()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-payment"
        );
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await StartOnThePaymentTask(fixture, token);

        using var confirm = await fixture.Instances.ProcessNext(
            token,
            instance,
            new ProcessNext { Action = "confirm" }
        );

        Assert.Equal(HttpStatusCode.Conflict, confirm.Response.StatusCode);
        Assert.Contains("PaymentNotCompleted", await confirm.Response.Content.ReadAsStringAsync());
    }

    private static async Task<AppFixture.ReadApiResponse<Instance>> StartOnThePaymentTask(
        AppFixture fixture,
        string token
    )
    {
        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        var instance = await instantiationResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, instance.Response.StatusCode);

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
                        JsonPatchOperation.ParseList(
                            """
                            [
                                { "op": "replace", "path": "/property1", "value": "2" },
                                { "op": "replace", "path": "/property2", "value": "2" }
                            ]
                            """
                        )
                    ),
                ],
                IgnoredValidators = null,
            }
        );
        Assert.Equal(HttpStatusCode.OK, patchResponse.Response.StatusCode);

        using var processNextResponse = await fixture.Instances.ProcessNext(token, instance);
        Assert.True(
            processNextResponse.Response.IsSuccessStatusCode,
            $"process/next answered {(int)processNextResponse.Response.StatusCode}: "
                + await processNextResponse.Response.Content.ReadAsStringAsync()
        );
        return instance;
    }

    private static async Task<JsonObject> ReadJson(AppFixture.ApiResponse response)
    {
        using (response)
        {
            return JsonNode.Parse(await response.Response.Content.ReadAsStringAsync())?.AsObject()
                ?? throw new JsonException("Empty response body.");
        }
    }

    private static async Task WaitForProcessEnd(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        DateTimeOffset deadline = DateTimeOffset.UtcNow + _attemptTimeout;
        string? lastSeenTask = null;
        while (DateTimeOffset.UtcNow < deadline)
        {
            using var refreshedResponse = await fixture.Instances.Get(token, instance);
            using var refreshed = await refreshedResponse.Read<Instance>();
            if (refreshed.Data.Model?.Process?.EndEvent == "EndEvent_1")
                return;

            lastSeenTask = refreshed.Data.Model?.Process?.CurrentTask?.ElementId;
            await Task.Delay(TimeSpan.FromMilliseconds(500));
        }

        Assert.Fail(
            $"The payment attempt did not move the process on within {_attemptTimeout.TotalSeconds:0}s "
                + $"(last seen task: {lastSeenTask}).\n----- APP LOGS -----\n{await fixture.GetAppLogs()}"
        );
    }
}
