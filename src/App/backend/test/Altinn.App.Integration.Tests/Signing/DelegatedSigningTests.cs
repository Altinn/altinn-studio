using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.App.Integration.Tests.WorkflowEngine;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.Signing;

/// <summary>
/// Delegated signing initializes its signees in three steps of the transition into the signing task: resolve the
/// signees, delegate them the right to sign, and notify them. Through a real workflow engine and Localtest, a
/// transient failure retries only the step it happened in, and a retried notification reaches nobody twice.
/// </summary>
[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class DelegatedSigningTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private const string Scenario = "delegated-signing";
    private const int SigneeCount = 2;

    private static readonly JsonSerializerOptions _webOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task ProcessNext_IntoSigning_DelegatesAndNotifiesEverySignee()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic, scenario: Scenario);
        var fixture = fixtureScope.Fixture;
        await ResetProbe(fixture, new());

        using SigningRun run = await EnterSigning(fixture);

        await AssertEverySigneeDelegatedAndNotified(fixture, run);
        ProbeState probe = await GetProbe(fixture);
        Assert.Equal(1, probe.ProviderCalls);
        Assert.Equal(SigneeCount, probe.Delegations.Length);
        Assert.All(probe.Delegations, attempt => Assert.True(attempt.Succeeded));
        Assert.Equal(SigneeCount, probe.Notifications.Length);
        Assert.All(probe.Notifications, attempt => Assert.Equal(200, attempt.StatusCode));
        Assert.Equal(SigneeCount, probe.Notifications.Select(attempt => attempt.IdempotentKey).Distinct().Count());
    }

    [Fact]
    public async Task ProcessNext_DelegationFailsOnce_RetriesOnlyTheDelegationStep()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic, scenario: Scenario);
        var fixture = fixtureScope.Fixture;
        await ResetProbe(fixture, new() { FailDelegationToSignee = 2 });

        using SigningRun run = await EnterSigning(fixture);

        await AssertEverySigneeDelegatedAndNotified(fixture, run);
        ProbeState probe = await GetProbe(fixture);
        // The signees were resolved once: the retry starts at the delegation step.
        Assert.Equal(1, probe.ProviderCalls);
        // The retry delegates again to the first signee, which Access Management accepts, and then reaches the second.
        var bySignee = probe.Delegations.GroupBy(attempt => attempt.Recipient).ToList();
        Assert.Equal(SigneeCount, bySignee.Count);
        Assert.Equal([true, true], bySignee[0].Select(attempt => attempt.Succeeded));
        Assert.Equal([true, false], bySignee[1].Select(attempt => attempt.Injected));
        Assert.True(bySignee[1].Last().Succeeded);
        Assert.Equal(SigneeCount, probe.Notifications.Length);
    }

    [Fact]
    public async Task ProcessNext_NotificationResponseLost_RetryNotifiesNobodyTwice()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic, scenario: Scenario);
        var fixture = fixtureScope.Fixture;
        await ResetProbe(fixture, new() { LoseNotificationResponseForSignee = 1 });

        using SigningRun run = await EnterSigning(fixture);

        await AssertEverySigneeDelegatedAndNotified(fixture, run);
        ProbeState probe = await GetProbe(fixture);
        // The retry starts at the notification step: nobody is resolved or delegated again.
        Assert.Equal(1, probe.ProviderCalls);
        Assert.Equal(SigneeCount, probe.Delegations.Length);
        // Localtest stored the first signee's message, but the app never saw it. The retry sends it again with the
        // same idempotency key, Localtest answers 409, and the app counts it as sent.
        var first = probe.Notifications.Where(attempt => attempt.Recipient == probe.Notifications[0].Recipient);
        Assert.Equal([200, 409], first.Select(attempt => attempt.StatusCode));
        Assert.Single(first.Select(attempt => attempt.IdempotentKey).Distinct());
        Assert.Equal(1, probe.Notifications.Count(attempt => attempt.Recipient != probe.Notifications[0].Recipient));
    }

    [Fact]
    public async Task Reject_ThenEnterSigningAgain_RevokesAndStartsOver()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic, scenario: Scenario);
        var fixture = fixtureScope.Fixture;
        await ResetProbe(fixture, new());
        using SigningRun run = await EnterSigning(fixture);

        using (
            var rejectResponse = await fixture.Instances.ProcessNext(
                run.Token,
                run.Instance,
                new() { Action = "reject" }
            )
        )
        {
            using var rejected = await rejectResponse.Read<AppProcessState>();
            Assert.Equal(HttpStatusCode.OK, rejected.Response.StatusCode);
            Assert.Equal("Task_1", rejected.Data.Model!.CurrentTask!.ElementId);
        }
        await ProcessNextInto(fixture, run, "Task_Signing");

        await AssertEverySigneeDelegatedAndNotified(fixture, run);
        ProbeState probe = await GetProbe(fixture);
        Assert.Equal(SigneeCount, probe.Revocations.Length);
        Assert.All(probe.Revocations, attempt => Assert.True(attempt.Succeeded));
        Assert.Equal(2, probe.ProviderCalls);
        Assert.Equal(2 * SigneeCount, probe.Delegations.Count(attempt => attempt.Succeeded));
        // A new visit to the task is a new step, so every signee is notified again, under a new key.
        Assert.Equal(2 * SigneeCount, probe.Notifications.Length);
        Assert.Equal(2 * SigneeCount, probe.Notifications.Select(attempt => attempt.IdempotentKey).Distinct().Count());
    }

    private sealed record SigningRun(string Token, AppFixture.ReadApiResponse<Instance> Instance) : IDisposable
    {
        public void Dispose() => Instance.Dispose();
    }

    private static async Task<SigningRun> EnterSigning(AppFixture fixture)
    {
        string token = await fixture.Auth.GetUserToken(userId: 1337);
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
                        new JsonPatch(
                            PatchOperation.Replace(JsonPointer.Create("property1"), JsonNode.Parse("\"2\"")),
                            PatchOperation.Replace(JsonPointer.Create("property2"), JsonNode.Parse("\"2\""))
                        )
                    ),
                ],
                IgnoredValidators = null,
            }
        );
        using var patched = await patchResponse.Read<DataPatchResponseMultiple>();
        Assert.Equal(HttpStatusCode.OK, patched.Response.StatusCode);

        var run = new SigningRun(token, instance);
        await ProcessNextInto(fixture, run, "Task_Signing");
        return run;
    }

    /// <summary>
    /// The signees are initialized before the transition commits, so the transition only lands on the signing task
    /// once every step, retries included, has completed.
    /// </summary>
    private static async Task ProcessNextInto(AppFixture fixture, SigningRun run, string taskId)
    {
        using var processNextResponse = await fixture.Instances.ProcessNext(run.Token, run.Instance);
        using var processState = await processNextResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, processState.Response.StatusCode);
        Assert.Equal(taskId, processState.Data.Model!.CurrentTask!.ElementId);
    }

    private static async Task AssertEverySigneeDelegatedAndNotified(AppFixture fixture, SigningRun run)
    {
        Instance instance = run.Instance.Data.Model!;
        using var response = await fixture.Generic.Get(
            $"/ttd/{fixture.App}/instances/{instance.Id}/signing",
            run.Token
        );
        using var signingState = await response.Read<SigningStateResponse>();
        Assert.Equal(HttpStatusCode.OK, signingState.Response.StatusCode);
        List<SigneeState> signees = signingState.Data.Model!.SigneeStates;
        Assert.Equal(SigneeCount, signees.Count);
        Assert.All(signees, signee => Assert.True(signee.DelegationSuccessful));
        Assert.All(signees, signee => Assert.Equal(NotificationStatus.Sent, signee.NotificationStatus));
    }

    private static async Task ResetProbe(AppFixture fixture, SigningFaults faults)
    {
        using var response = await fixture
            .GetDirectAppClient()
            .PostAsJsonAsync("/test/delegated-signing/reset", faults, _webOptions);
        response.EnsureSuccessStatusCode();
    }

    private static async Task<ProbeState> GetProbe(AppFixture fixture) =>
        await fixture.GetDirectAppClient().GetFromJsonAsync<ProbeState>("/test/delegated-signing/state", _webOptions)
        ?? throw new InvalidOperationException("The delegated-signing probe returned no state.");

    // Mirrors the scenario's probe types, which the test project does not compile.
    private sealed record SigningFaults
    {
        public int? FailDelegationToSignee { get; init; }
        public int? LoseNotificationResponseForSignee { get; init; }
    }

    private sealed record ProbeState(
        int ProviderCalls,
        DelegationAttempt[] Delegations,
        RevocationAttempt[] Revocations,
        NotificationAttempt[] Notifications
    );

    private sealed record DelegationAttempt(string Recipient, bool Injected, bool Succeeded);

    private sealed record RevocationAttempt(string Recipient, bool Succeeded);

    private sealed record NotificationAttempt(string Recipient, Guid IdempotentKey, int StatusCode, bool ResponseLost);
}
