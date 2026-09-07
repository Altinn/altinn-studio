using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.App.Integration.Tests.WorkflowEngine;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.Signing;

[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class DelegatedSigningInitializationTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private const string SigningTask = "Task_Signing";
    private const string FirstPerson = "01899699552";
    private const string SecondPerson = "17858296439";
    private const int FirstPartyId = 510001;
    private const int SecondPartyId = 510002;
    private const string FirstPartyUuid = "186aaeb4-97e6-40f4-8d48-31782a66782b";
    private const string SecondPartyUuid = "6714969f-8cf7-4282-bd71-7627bc9d4380";

    [Fact]
    public async Task ProcessNext_InitializesSigneesInSeparateWorkflowSteps()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture);
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);

        await EnterSigning(fixture, token, instance);

        await AssertInitialized(fixture, token, instance);
        var state = await GetScenarioState(fixture);
        Assert.Equal(1, state.ProviderCalls);
        AssertDelegations(state, expectedAttemptsPerRecipient: 1);
        Assert.Equal(2, state.AcceptedNotificationCount);
        Assert.Equal(2, state.Notifications.Length);
        Assert.All(state.Notifications, notification => Assert.True(notification.Accepted));
        AssertNotificationKeys(state);

        var callbacks = SigningCallbacks(state);
        Assert.Equal(["ResolveSignees", "DelegateSigneeRights", "NotifySignees"], callbacks.Select(c => c.CommandKey));
        Assert.Single(callbacks.Select(c => c.WorkflowId).Distinct());
        Assert.Equal(3, callbacks.Select(c => c.StepId).Distinct().Count());
        Assert.All(callbacks, callback => Assert.NotEqual(Guid.Empty, callback.StepId));
    }

    [Fact]
    public async Task ProcessNext_NotificationFailsAfterFirstRecipient_RetriesOnlyNotificationsWithoutDuplicateMessages()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture, notificationFailure: new FailureRule(2, 1, 503));
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);

        await EnterSigning(fixture, token, instance);

        await AssertInitialized(fixture, token, instance);
        var state = await GetScenarioState(fixture);
        Assert.Equal(1, state.ProviderCalls);
        AssertDelegations(state, expectedAttemptsPerRecipient: 1);
        Assert.Equal(2, state.AcceptedNotificationCount);
        AssertNotificationKeys(state);
        var firstRecipient = NotificationsFor(state, FirstPerson);
        Assert.Equal(2, firstRecipient.Length);
        Assert.Single(firstRecipient, notification => notification.Accepted);
        Assert.Single(firstRecipient, notification => notification.Duplicate && notification.StatusCode == 409);
        var secondRecipient = NotificationsFor(state, SecondPerson);
        Assert.Equal(2, secondRecipient.Length);
        Assert.Single(secondRecipient, notification => notification.StatusCode == 503 && !notification.Accepted);
        Assert.Single(secondRecipient, notification => notification.Accepted);
        AssertOnlyStepRetried(state, "NotifySignees", expectedAttempts: 2);
    }

    [Fact]
    public async Task ProcessNext_GrantSucceedsButResponseIsLost_ReplaysGrantAgainstAccessManagement()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture, delegationFailure: new FailureRule(2, 1, 503, AfterSuccess: true));
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);

        await EnterSigning(fixture, token, instance);

        await AssertInitialized(fixture, token, instance);
        var state = await GetScenarioState(fixture);
        Assert.Equal(1, state.ProviderCalls);
        // Both grants reached real Access Management before the failure, but the failed callback saved no progress.
        AssertDelegations(state, expectedAttemptsPerRecipient: 2);
        Assert.Single(state.Delegations, delegation => delegation.StatusCode == 503);
        Assert.All(state.Delegations, delegation => Assert.True(delegation.Forwarded));
        Assert.Equal(2, state.AcceptedNotificationCount);
        Assert.Equal(2, state.Notifications.Length);
        AssertOnlyStepRetried(state, "DelegateSigneeRights", expectedAttempts: 2);
    }

    [Fact]
    public async Task ProcessNext_PermanentDelegationRejection_NotifiesOnlyTheDelegatedRecipient()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture, delegationFailure: new FailureRule(2, -1, 400));
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);

        await EnterSigning(fixture, token, instance);

        using var response = await fixture.Instances.Get(token, instance);
        using var refreshed = await response.Read<Instance>();
        Assert.Equal(HttpStatusCode.OK, refreshed.Response.StatusCode);
        Assert.Equal(SigningTask, refreshed.Data.Model!.Process.CurrentTask!.ElementId);
        Assert.Single(refreshed.Data.Model.Data, data => data.DataType == "signee-states");

        var signing = await ReadSigningState(fixture, token, refreshed);
        Assert.Equal(2, signing.SigneeStates.Count);
        var first = Assert.Single(signing.SigneeStates, signee => signee.PartyId == FirstPartyId);
        Assert.True(first.DelegationSuccessful);
        Assert.Null(first.DelegationFailure);
        Assert.Equal(NotificationStatus.Sent, first.NotificationStatus);
        Assert.Null(first.NotificationFailure);
        var second = Assert.Single(signing.SigneeStates, signee => signee.PartyId == SecondPartyId);
        Assert.False(second.DelegationSuccessful);
        Assert.Equal(SigneeDelegationFailure.Rejected, second.DelegationFailure);
        Assert.Equal(NotificationStatus.NotSent, second.NotificationStatus);
        Assert.Null(second.NotificationFailure);

        var state = await GetScenarioState(fixture);
        Assert.Equal(1, state.ProviderCalls);
        Assert.Equal(2, state.Delegations.Length);
        var granted = Assert.Single(state.Delegations, delegation => delegation.Recipient == FirstPartyUuid);
        Assert.True(granted.Forwarded);
        Assert.Equal(200, granted.StatusCode);
        var rejected = Assert.Single(state.Delegations, delegation => delegation.Recipient == SecondPartyUuid);
        Assert.False(rejected.Forwarded);
        Assert.Equal(400, rejected.StatusCode);
        Assert.Equal(1, state.AcceptedNotificationCount);
        var notification = Assert.Single(state.Notifications);
        Assert.Equal($"urn:altinn:person:identifier-no:{FirstPerson}", notification.Recipient);
        Assert.True(notification.Accepted);
        Assert.NotEqual(Guid.Empty, Guid.Parse(notification.IdempotencyKey));
        Assert.Empty(NotificationsFor(state, SecondPerson));
        var callbacks = SigningCallbacks(state);
        Assert.Equal(["ResolveSignees", "DelegateSigneeRights", "NotifySignees"], callbacks.Select(c => c.CommandKey));
        Assert.All(
            callbacks,
            callback =>
            {
                Assert.Equal(0, callback.RetryCount);
                Assert.Equal(200, callback.StatusCode);
            }
        );
    }

    [Fact]
    public async Task ProcessNext_PermanentNotificationRejection_PersistsFailureForOnlyThatRecipient()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture, notificationFailure: new FailureRule(2, -1, 400));
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);

        await EnterSigning(fixture, token, instance);

        await AssertInitialized(fixture, token, instance, notificationFailurePartyId: SecondPartyId);
        var state = await GetScenarioState(fixture);
        Assert.Equal(1, state.ProviderCalls);
        AssertDelegations(state, expectedAttemptsPerRecipient: 1);
        Assert.Equal(1, state.AcceptedNotificationCount);
        Assert.Single(NotificationsFor(state, FirstPerson), notification => notification.Accepted);
        Assert.Single(NotificationsFor(state, SecondPerson), notification => notification.StatusCode == 400);
        Assert.Equal(3, SigningCallbacks(state).Length);
    }

    [Fact]
    public async Task ResumeCurrentTask_AfterNotificationRetriesExhausted_KeepsWorkflowStepAndNotificationKeys()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture, notificationFailure: new FailureRule(2, -1, 503));
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);

        var failedWorkflowId = await FailEnteringSigning(fixture, token, instance);
        string stateElementId = await GetStateElementId(fixture, token, instance);
        var before = await GetScenarioState(fixture);
        var failedCallbacks = SigningCallbacks(before).Where(c => c.CommandKey == "NotifySignees").ToArray();
        Assert.Equal(3, failedCallbacks.Length);
        Assert.All(failedCallbacks, callback => Assert.Equal(failedWorkflowId, callback.WorkflowId));
        Guid failedStepId = Assert.Single(failedCallbacks.Select(c => c.StepId).Distinct());
        Assert.NotEqual(Guid.Empty, failedStepId);
        Assert.Equal(1, before.AcceptedNotificationCount);
        Assert.Equal(1, before.ProviderCalls);
        AssertDelegations(before, expectedAttemptsPerRecipient: 1);
        AssertNotificationKeys(before);

        var pending = await ReadSigningState(fixture, token, instance);
        Assert.All(
            pending.SigneeStates,
            signee =>
            {
                Assert.True(signee.DelegationSuccessful);
                Assert.Equal(NotificationStatus.NotSent, signee.NotificationStatus);
                Assert.Null(signee.NotificationFailure);
            }
        );

        using var blocked = await fixture.Instances.ProcessNext(token, instance);
        Assert.Equal(HttpStatusCode.Conflict, blocked.Response.StatusCode);
        await AllowScenario(fixture);
        await ResumeSigning(fixture, token, instance);

        Assert.Equal(stateElementId, await AssertInitialized(fixture, token, instance));
        var after = await GetScenarioState(fixture);
        Assert.Equal(before.ProviderCalls, after.ProviderCalls);
        Assert.Equal(before.Delegations, after.Delegations);
        Assert.Equal(2, after.AcceptedNotificationCount);
        AssertNotificationKeys(after);
        foreach (var notification in before.Notifications)
        {
            Assert.All(
                after.Notifications.Where(n => n.Recipient == notification.Recipient),
                retried => Assert.Equal(notification.IdempotencyKey, retried.IdempotencyKey)
            );
        }

        var resumed = Assert.Single(SigningCallbacks(after).Skip(SigningCallbacks(before).Length));
        Assert.Equal("NotifySignees", resumed.CommandKey);
        Assert.Equal(failedWorkflowId, resumed.WorkflowId);
        Assert.Equal(failedStepId, resumed.StepId);
    }

    [Fact]
    public async Task ProcessNext_ResolveResponseLostAfterStorageSave_AdoptsSavedSigneesOnRetry()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture, loseResolveResponseOnce: true);
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);

        await EnterSigning(fixture, token, instance);

        await AssertInitialized(fixture, token, instance);
        var state = await GetScenarioState(fixture);
        Assert.Equal(1, state.LostResolveResponses);
        Assert.Equal(1, state.ProviderCalls);
        AssertDelegations(state, expectedAttemptsPerRecipient: 1);
        Assert.Equal(2, state.AcceptedNotificationCount);
        Assert.Equal(2, state.Notifications.Length);
        AssertOnlyStepRetried(state, "ResolveSignees", expectedAttempts: 2);
    }

    [Fact]
    public async Task ResumeCurrentTask_AfterProviderContractFailure_ResolvesSigneesInTheSameWorkflow()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture, providerContractFailure: true);
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);

        var failedWorkflowId = await FailEnteringSigning(fixture, token, instance);
        var before = await GetScenarioState(fixture);
        var failed = Assert.Single(SigningCallbacks(before));
        Assert.Equal("ResolveSignees", failed.CommandKey);
        Assert.Equal(422, failed.StatusCode);
        Assert.Equal(failedWorkflowId, failed.WorkflowId);
        Assert.Empty(before.Delegations);
        Assert.Empty(before.Notifications);

        await AllowScenario(fixture);
        await ResumeSigning(fixture, token, instance);

        await AssertInitialized(fixture, token, instance);
        var after = await GetScenarioState(fixture);
        Assert.Equal(1, after.ProviderCalls);
        Assert.Equal(2, after.AcceptedNotificationCount);
        AssertDelegations(after, expectedAttemptsPerRecipient: 1);
        Assert.All(SigningCallbacks(after), callback => Assert.Equal(failedWorkflowId, callback.WorkflowId));
        AssertOnlyStepRetried(after, "ResolveSignees", expectedAttempts: 2);
    }

    private static async Task<AppFixture.ReadApiResponse<Instance>> CreateInstance(AppFixture fixture, string token)
    {
        using var response = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        var instance = await response.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, instance.Response.StatusCode);
        Assert.Equal("Task_1", instance.Data.Model!.Process.CurrentTask!.ElementId);
        Guid dataElementId = Guid.Parse(instance.Data.Model.Data.Single(d => d.DataType == "model").Id);
        using var patch = await fixture.Instances.PatchFormData(
            token,
            instance,
            new DataPatchRequestMultiple
            {
                Patches =
                [
                    new(
                        dataElementId,
                        new Json.Patch.JsonPatch(
                            Json.Patch.PatchOperation.Replace(
                                Json.Pointer.JsonPointer.Create("property1"),
                                JsonNode.Parse("\"2\"")
                            ),
                            Json.Patch.PatchOperation.Replace(
                                Json.Pointer.JsonPointer.Create("property2"),
                                JsonNode.Parse("\"2\"")
                            )
                        )
                    ),
                ],
                IgnoredValidators = null,
            }
        );
        Assert.Equal(HttpStatusCode.OK, patch.Response.StatusCode);
        return instance;
    }

    private static async Task EnterSigning(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        using var response = await fixture.Instances.ProcessNext(token, instance);
        using var process = await response.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, process.Response.StatusCode);
        Assert.Equal(SigningTask, process.Data.Model!.CurrentTask!.ElementId);
    }

    private static async Task ResumeSigning(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        using var response = await fixture.Instances.ResumeCurrentTask(token, instance);
        using var process = await response.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, process.Response.StatusCode);
        Assert.Equal(SigningTask, process.Data.Model!.CurrentTask!.ElementId);
    }

    private static async Task<Guid> FailEnteringSigning(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        using var response = await fixture.Instances.ProcessNext(token, instance);
        using var failure = await response.Read<string>();
        Assert.Equal(HttpStatusCode.InternalServerError, failure.Response.StatusCode);
        using var json = JsonDocument.Parse(failure.Data.Model!);
        var workflow = json.RootElement.GetProperty("workflowFailure");
        Assert.Equal("stepFailed", workflow.GetProperty("kind").GetString());
        Assert.Equal("resumeWorkflow", workflow.GetProperty("retryAction").GetString());
        Guid workflowId = workflow.GetProperty("workflowId").GetGuid();
        Assert.NotEqual(Guid.Empty, workflowId);
        Assert.Equal(workflowId, workflow.GetProperty("retryTargetWorkflowId").GetGuid());
        Assert.False(workflow.TryGetProperty("lastError", out _));
        return workflowId;
    }

    private static async Task<string> AssertInitialized(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance,
        int? notificationFailurePartyId = null
    )
    {
        using var response = await fixture.Instances.Get(token, instance);
        using var refreshed = await response.Read<Instance>();
        Assert.Equal(HttpStatusCode.OK, refreshed.Response.StatusCode);
        Assert.Equal(SigningTask, refreshed.Data.Model!.Process.CurrentTask!.ElementId);
        var stateElement = Assert.Single(refreshed.Data.Model.Data, d => d.DataType == "signee-states");
        Assert.NotNull(stateElement.References);
        Assert.Contains(
            stateElement.References,
            reference =>
                reference.Relation == RelationType.GeneratedFrom
                && reference.ValueType == ReferenceType.Task
                && reference.Value == SigningTask
        );

        var signing = await ReadSigningState(fixture, token, refreshed);
        Assert.Equal([FirstPartyId, SecondPartyId], signing.SigneeStates.Select(signee => signee.PartyId).Order());
        Assert.All(
            signing.SigneeStates,
            signee =>
            {
                Assert.True(signee.DelegationSuccessful);
                Assert.Null(signee.DelegationFailure);
                Assert.Null(signee.SignedTime);
                if (signee.PartyId == notificationFailurePartyId)
                {
                    Assert.Equal(NotificationStatus.Failed, signee.NotificationStatus);
                    Assert.Equal(SigneeNotificationFailure.Rejected, signee.NotificationFailure);
                }
                else
                {
                    Assert.Equal(NotificationStatus.Sent, signee.NotificationStatus);
                    Assert.Null(signee.NotificationFailure);
                }
            }
        );
        return stateElement.Id;
    }

    private static async Task<string> GetStateElementId(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        using var response = await fixture.Instances.Get(token, instance);
        using var refreshed = await response.Read<Instance>();
        Assert.Equal(HttpStatusCode.OK, refreshed.Response.StatusCode);
        return Assert.Single(refreshed.Data.Model!.Data, d => d.DataType == "signee-states").Id;
    }

    private static async Task<SigningStateResponse> ReadSigningState(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        using var response = await fixture.Signing.GetState(token, instance, SigningTask);
        using var signing = await response.Read<SigningStateResponse>();
        Assert.Equal(HttpStatusCode.OK, signing.Response.StatusCode);
        return Assert.IsType<SigningStateResponse>(signing.Data.Model);
    }

    private static void AssertDelegations(ScenarioState state, int expectedAttemptsPerRecipient)
    {
        Assert.Equal(expectedAttemptsPerRecipient * 2, state.Delegations.Length);
        Assert.Equal(expectedAttemptsPerRecipient, state.Delegations.Count(d => d.Recipient == FirstPartyUuid));
        Assert.Equal(expectedAttemptsPerRecipient, state.Delegations.Count(d => d.Recipient == SecondPartyUuid));
        Assert.All(state.Delegations, delegation => Assert.True(delegation.Forwarded));
    }

    private static void AssertNotificationKeys(ScenarioState state)
    {
        var recipients = state.Notifications.GroupBy(notification => notification.Recipient).ToArray();
        Assert.Equal(2, recipients.Length);
        foreach (var recipient in recipients)
        {
            string key = Assert.Single(recipient.Select(notification => notification.IdempotencyKey).Distinct());
            Assert.NotEqual(Guid.Empty, Guid.Parse(key));
        }
        Assert.Equal(2, state.Notifications.Select(notification => notification.IdempotencyKey).Distinct().Count());
    }

    private static void AssertOnlyStepRetried(ScenarioState state, string commandKey, int expectedAttempts)
    {
        var callbacks = SigningCallbacks(state);
        Assert.Equal(expectedAttempts + 2, callbacks.Length);
        Assert.Single(callbacks.Select(callback => callback.WorkflowId).Distinct());
        foreach (string key in new[] { "ResolveSignees", "DelegateSigneeRights", "NotifySignees" })
        {
            var attempts = callbacks.Where(callback => callback.CommandKey == key).ToArray();
            Assert.Equal(key == commandKey ? expectedAttempts : 1, attempts.Length);
            Assert.NotEqual(Guid.Empty, Assert.Single(attempts.Select(callback => callback.StepId).Distinct()));
        }
        Assert.Equal(3, callbacks.Select(callback => callback.StepId).Distinct().Count());
    }

    private static CallbackAttempt[] SigningCallbacks(ScenarioState state) =>
        state
            .Callbacks.Where(callback =>
                callback.CommandKey is "ResolveSignees" or "DelegateSigneeRights" or "NotifySignees"
            )
            .ToArray();

    private static NotificationAttempt[] NotificationsFor(ScenarioState state, string personNumber) =>
        state
            .Notifications.Where(notification =>
                notification.Recipient == $"urn:altinn:person:identifier-no:{personNumber}"
            )
            .ToArray();

    private static async Task ResetScenario(
        AppFixture fixture,
        FailureRule? delegationFailure = null,
        FailureRule? notificationFailure = null,
        bool loseResolveResponseOnce = false,
        bool providerContractFailure = false
    )
    {
        using var response = await fixture
            .GetDirectAppClient()
            .PostAsJsonAsync(
                "/test/delegated-signing/reset",
                new
                {
                    signees = new[] { FirstPerson, SecondPerson },
                    delegationFailure,
                    notificationFailure,
                    loseResolveResponseOnce,
                    providerContractFailure,
                }
            );
        response.EnsureSuccessStatusCode();
    }

    private static async Task AllowScenario(AppFixture fixture)
    {
        using var response = await fixture.GetDirectAppClient().PostAsync("/test/delegated-signing/allow", null);
        response.EnsureSuccessStatusCode();
    }

    private static async Task<ScenarioState> GetScenarioState(AppFixture fixture)
    {
        using var response = await fixture.GetDirectAppClient().GetAsync("/test/delegated-signing/state");
        response.EnsureSuccessStatusCode();
        return Assert.IsType<ScenarioState>(await response.Content.ReadFromJsonAsync<ScenarioState>());
    }

    private sealed record FailureRule(
        int RecipientNumber,
        int RemainingFailures,
        int StatusCode,
        bool AfterSuccess = false
    );

    private sealed record ScenarioState(
        int ProviderCalls,
        DelegationAttempt[] Delegations,
        NotificationAttempt[] Notifications,
        int AcceptedNotificationCount,
        int LostResolveResponses,
        CallbackAttempt[] Callbacks
    );

    private sealed record DelegationAttempt(
        string InstanceId,
        string Recipient,
        int Attempt,
        bool Forwarded,
        int StatusCode
    );

    private sealed record NotificationAttempt(
        string InstanceId,
        string Recipient,
        string IdempotencyKey,
        int Attempt,
        bool Accepted,
        bool Duplicate,
        int StatusCode
    );

    private sealed record CallbackAttempt(
        string CommandKey,
        Guid WorkflowId,
        Guid StepId,
        int RetryCount,
        int StatusCode
    );
}
