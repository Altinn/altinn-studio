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
        Assert.Equal(1, callbacks.Count(c => c.CommandKey == "ResolveSignees"));
        Assert.Equal(2, callbacks.Count(c => c.CommandKey == "DelegateSigneeRights"));
        Assert.Equal(2, callbacks.Count(c => c.CommandKey == "NotifySignee"));
        Assert.Equal(5, callbacks.Select(c => c.StepId).Distinct().Count());
        Assert.All(callbacks, callback => Assert.NotEqual(Guid.Empty, callback.StepId));
        Assert.Equal(
            new[] { "ResolveSignees", "DelegateSigneeRights", "DelegateSigneeRights", "NotifySignee", "NotifySignee" },
            callbacks.Select(callback => callback.CommandKey)
        );
        Assert.Single(
            callbacks
                .Where(callback => callback.CommandKey != "ResolveSignees")
                .Select(callback => callback.WorkflowId)
                .Distinct()
        );
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
        Assert.Single(firstRecipient);
        Assert.Single(firstRecipient, notification => notification.Accepted);
        var secondRecipient = NotificationsFor(state, SecondPerson);
        Assert.Equal(2, secondRecipient.Length);
        Assert.Single(secondRecipient, notification => notification.StatusCode == 503 && !notification.Accepted);
        Assert.Single(secondRecipient, notification => notification.Accepted);
        Assert.Equal(1, state.Callbacks.Count(c => c.CommandKey == "ResolveSignees"));
        Assert.Equal(2, state.Callbacks.Count(c => c.CommandKey == "DelegateSigneeRights"));
        Assert.Equal(3, SigningCallbacks(state).Count(c => c.CommandKey == "NotifySignee"));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ProcessNext_DelegationFailure_RetriesOnlyFailedRecipient(bool afterSuccess)
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture, delegationFailure: new FailureRule(2, 1, 503, AfterSuccess: afterSuccess));
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);

        await EnterSigning(fixture, token, instance);

        await AssertInitialized(fixture, token, instance);
        var state = await GetScenarioState(fixture);
        Assert.Equal(1, state.ProviderCalls);
        // Alice completed and was checkpointed. Only Bob repeats the grant after losing its response.
        Assert.Equal(3, state.Delegations.Length);
        Assert.Single(state.Delegations, d => d.Recipient == FirstPartyUuid);
        Assert.Equal(2, state.Delegations.Count(d => d.Recipient == SecondPartyUuid));
        Assert.Single(state.Delegations, delegation => delegation.StatusCode == 503);
        Assert.Equal(afterSuccess, Assert.Single(state.Delegations, d => d.StatusCode == 503).Forwarded);
        Assert.Equal(2, state.AcceptedNotificationCount);
        Assert.Equal(2, state.Notifications.Length);
        Assert.Equal(1, state.Callbacks.Count(c => c.CommandKey == "ResolveSignees"));
        Assert.Equal(3, state.Callbacks.Count(c => c.CommandKey == "DelegateSigneeRights"));
    }

    [Fact]
    public async Task NotificationResponseLost_ReplaysOnlyAffectedRecipientWithTheSameKey()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture, notificationFailure: new FailureRule(2, 1, 503, AfterSuccess: true));
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);

        await EnterSigning(fixture, token, instance);
        await AssertInitialized(fixture, token, instance);

        var state = await GetScenarioState(fixture);
        AssertDelegations(state, expectedAttemptsPerRecipient: 1);
        Assert.Single(NotificationsFor(state, FirstPerson));
        var second = NotificationsFor(state, SecondPerson);
        Assert.Equal(2, second.Length);
        Assert.Single(second, attempt => attempt.Accepted && attempt.StatusCode == 503);
        Assert.Single(second, attempt => attempt.Duplicate && attempt.StatusCode == 409);
        Assert.Equal(2, state.AcceptedNotificationCount);
        AssertNotificationKeys(state);
    }

    [Fact]
    public async Task ProcessNext_PermanentDelegationRejection_BlocksCommitAndResumesOnlyFailedRecipient()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture, delegationFailure: new FailureRule(2, -1, 400));
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);

        await EnterSigning(fixture, token, instance, expectFailure: true);

        using var response = await fixture.Instances.Get(token, instance);
        using var refreshed = await response.Read<Instance>();
        Assert.Equal(HttpStatusCode.OK, refreshed.Response.StatusCode);
        Assert.Equal("Task_1", refreshed.Data.Model!.Process.CurrentTask!.ElementId);
        Assert.Single(refreshed.Data.Model.Data, data => data.DataType == "signee-states");

        var signing = await ReadSigningState(fixture, token, refreshed);
        Assert.Equal(2, signing.SigneeStates.Count);
        var first = Assert.Single(signing.SigneeStates, signee => signee.PartyId == FirstPartyId);
        Assert.True(first.DelegationSuccessful);
        Assert.Null(first.DelegationFailure);
        Assert.Equal(NotificationStatus.NotSent, first.NotificationStatus);
        Assert.Null(first.NotificationFailure);
        var second = Assert.Single(signing.SigneeStates, signee => signee.PartyId == SecondPartyId);
        Assert.False(second.DelegationSuccessful);
        Assert.Null(second.DelegationFailure); // The engine owns the failed execution; Storage holds completed facts.
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
        Assert.Equal(0, state.AcceptedNotificationCount);
        Assert.Empty(state.Notifications);
        var callbacks = SigningCallbacks(state);
        Assert.Equal(1, callbacks.Count(c => c.CommandKey == "ResolveSignees"));
        Assert.Equal(2, callbacks.Count(c => c.CommandKey == "DelegateSigneeRights"));
        Assert.DoesNotContain(callbacks, c => c.CommandKey == "NotifySignee");
        Assert.Equal(1, callbacks.Count(c => c.StatusCode == 422));
        Assert.Equal(0, callbacks.Count(c => c.RetryCount > 0));

        await AllowScenario(fixture);
        await ResumeSigning(fixture, token, instance);
        await AssertInitialized(fixture, token, instance);
        var recovered = await GetScenarioState(fixture);
        Assert.Equal(2, recovered.AcceptedNotificationCount);
        Assert.Single(recovered.Delegations, d => d.Recipient == FirstPartyUuid);
        Assert.Equal(2, recovered.Delegations.Count(d => d.Recipient == SecondPartyUuid));
        Assert.Single(NotificationsFor(recovered, FirstPerson), notification => notification.Accepted);
        Assert.Single(NotificationsFor(recovered, SecondPerson), notification => notification.Accepted);
    }

    [Theory]
    [InlineData(400, 1, 422)]
    [InlineData(503, 3, 500)]
    public async Task NotificationFailure_BlocksCommitAndProcessResumeRetriesOnlyFailedRecipient(
        int dependencyStatusCode,
        int expectedFailedAttempts,
        int callbackStatusCode
    )
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture, notificationFailure: new FailureRule(2, -1, dependencyStatusCode));
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);

        Guid failedWorkflowId = await FailEnteringSigning(fixture, token, instance);
        var before = await GetScenarioState(fixture);
        Assert.Equal(1, before.ProviderCalls);
        AssertDelegations(before, expectedAttemptsPerRecipient: 1);
        Assert.Equal(1, before.AcceptedNotificationCount);
        Assert.Single(NotificationsFor(before, FirstPerson), notification => notification.Accepted);
        Assert.Equal(expectedFailedAttempts, NotificationsFor(before, SecondPerson).Length);
        Assert.All(
            NotificationsFor(before, SecondPerson),
            notification => Assert.Equal(dependencyStatusCode, notification.StatusCode)
        );
        AssertNotificationKeys(before);
        Guid failedStepId = Assert.Single(
            SigningCallbacks(before)
                .Where(callback => callback.StatusCode == callbackStatusCode)
                .Select(callback => callback.StepId)
                .Distinct()
        );
        Assert.All(
            SigningCallbacks(before).Where(callback => callback.StepId == failedStepId),
            callback => Assert.Equal(failedWorkflowId, callback.WorkflowId)
        );

        using var response = await fixture.Instances.Get(token, instance);
        using var refreshed = await response.Read<Instance>();
        Assert.Equal(HttpStatusCode.OK, refreshed.Response.StatusCode);
        Assert.Equal("Task_1", refreshed.Data.Model!.Process.CurrentTask!.ElementId);
        Assert.Equal(ProcessStatus.Processing, refreshed.Data.Model.Process.Status);
        var pending = await ReadSigningState(fixture, token, refreshed);
        Assert.All(pending.SigneeStates, signee => Assert.True(signee.DelegationSuccessful));
        Assert.Equal(
            NotificationStatus.Sent,
            pending.SigneeStates.Single(signee => signee.PartyId == FirstPartyId).NotificationStatus
        );
        Assert.Equal(
            NotificationStatus.NotSent,
            pending.SigneeStates.Single(signee => signee.PartyId == SecondPartyId).NotificationStatus
        );
        Assert.DoesNotContain(
            before.Callbacks,
            callback => callback.WorkflowId == failedWorkflowId && callback.CommandKey == "CommitProcessState"
        );

        await AllowScenario(fixture);
        await ResumeSigning(fixture, token, instance);
        await AssertInitialized(fixture, token, instance);
        var after = await GetScenarioState(fixture);
        Assert.Equal(before.ProviderCalls, after.ProviderCalls);
        Assert.Equal(before.Delegations, after.Delegations);
        Assert.Equal(2, after.AcceptedNotificationCount);
        Assert.Single(NotificationsFor(after, FirstPerson));
        Assert.Equal(expectedFailedAttempts + 1, NotificationsFor(after, SecondPerson).Length);
        AssertNotificationKeys(after);
        Assert.Equal(
            NotificationsFor(before, SecondPerson)[0].IdempotencyKey,
            NotificationsFor(after, SecondPerson)[^1].IdempotencyKey
        );
        var resumed = Assert.Single(SigningCallbacks(after).Skip(SigningCallbacks(before).Length));
        Assert.Equal("NotifySignee", resumed.CommandKey);
        Assert.Equal(failedWorkflowId, resumed.WorkflowId);
        Assert.Equal(failedStepId, resumed.StepId);
    }

    [Fact]
    public async Task CompletedSigningEntry_RejectAndReenter_CreatesNewRecipientsAndNotificationKeys()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture);
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);
        await EnterSigning(fixture, token, instance);
        string originalElement = await AssertInitialized(fixture, token, instance);
        var before = await GetScenarioState(fixture);

        using var reject = await fixture.Instances.ProcessNext(token, instance, new ProcessNext { Action = "reject" });
        using var rejected = await reject.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, rejected.Response.StatusCode);
        Assert.Equal("Task_1", rejected.Data.Model!.CurrentTask!.ElementId);
        await EnterSigning(fixture, token, instance);
        string newElement = await AssertInitialized(fixture, token, instance);
        Assert.NotEqual(originalElement, newElement);
        var after = await GetScenarioState(fixture);
        Assert.Equal(2, after.ProviderCalls);
        Assert.Equal(4, after.AcceptedNotificationCount);
        Assert.Equal(4, after.Notifications.Select(notification => notification.IdempotencyKey).Distinct().Count());
        Assert.All(
            after.Notifications.Skip(before.Notifications.Length),
            notification =>
                Assert.DoesNotContain(
                    before.Notifications,
                    original => original.IdempotencyKey == notification.IdempotencyKey
                )
        );
    }

    [Theory]
    [InlineData("ResolveSignees")]
    [InlineData("DelegateSigneeRights")]
    [InlineData("NotifySignee")]
    public async Task CallbackResponseLostAfterAggregateSave_ReplaysAcceptedMutationAndRetainsFrozenRecipients(
        string commandKey
    )
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        await ResetScenario(
            fixture,
            loseCallbackResponseOnce: commandKey,
            changeSigneesOnProviderRetry: commandKey == "ResolveSignees"
        );
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstance(fixture, token);

        await EnterSigning(fixture, token, instance);
        string stateElementId = await AssertInitialized(fixture, token, instance);
        var state = await GetScenarioState(fixture);
        Assert.Equal(1, state.LostCallbackResponses);
        // The provider is read-only and may run again when its own callback response is lost. Its changed
        // second result must never replace the first accepted recipient list during aggregate replay.
        Assert.Equal(commandKey == "ResolveSignees" ? 2 : 1, state.ProviderCalls);
        Assert.NotEmpty(state.ResolvedStateElementIds);
        Assert.All(state.ResolvedStateElementIds, id => Assert.Equal(stateElementId, id));
        Assert.Equal(2, state.ResolvedSigneeIds[0].Length);
        Assert.All(state.ResolvedSigneeIds, ids => Assert.Equal(state.ResolvedSigneeIds[0], ids));
        Assert.Equal(2, state.AcceptedNotificationCount);
        AssertNotificationKeys(state);
        var callbacks = SigningCallbacks(state);
        var replayedStep = Assert.Single(callbacks.GroupBy(callback => callback.StepId), group => group.Count() == 2);
        Assert.All(replayedStep, callback => Assert.Equal(commandKey, callback.CommandKey));
        Assert.All(
            callbacks.GroupBy(callback => callback.StepId).Where(group => group.Key != replayedStep.Key),
            group => Assert.Single(group)
        );
        Assert.Single(replayedStep, callback => callback.StatusCode == 503);
        Assert.Single(replayedStep, callback => callback.StatusCode == 200);
        Assert.Single(replayedStep.Select(callback => callback.WorkflowId).Distinct());
        Assert.Equal(5, callbacks.Select(callback => callback.StepId).Distinct().Count());
        if (commandKey == "DelegateSigneeRights")
        {
            Assert.Equal(3, state.Delegations.Length);
            Assert.Equal(2, state.Delegations.Count(delegation => delegation.Recipient == FirstPartyUuid));
            Assert.Single(state.Delegations, delegation => delegation.Recipient == SecondPartyUuid);
        }
        else
        {
            AssertDelegations(state, expectedAttemptsPerRecipient: 1);
        }
        if (commandKey == "NotifySignee")
        {
            Assert.Equal(3, state.Notifications.Length);
            Assert.Single(NotificationsFor(state, FirstPerson), notification => notification.Duplicate);
            Assert.Single(NotificationsFor(state, SecondPerson));
        }
        else
        {
            Assert.Equal(2, state.Notifications.Length);
        }
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
        Assert.All(
            SigningCallbacks(after).Where(c => c.CommandKey == "ResolveSignees"),
            callback => Assert.Equal(failedWorkflowId, callback.WorkflowId)
        );
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
        AppFixture.ReadApiResponse<Instance> instance,
        bool expectFailure = false
    )
    {
        using var response = await fixture.Instances.ProcessNext(token, instance);
        using var process = await response.Read<AppProcessState>();
        Assert.Equal(
            expectFailure ? HttpStatusCode.InternalServerError : HttpStatusCode.OK,
            process.Response.StatusCode
        );
        if (!expectFailure)
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
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        using var response = await fixture.Instances.Get(token, instance);
        using var refreshed = await response.Read<Instance>();
        Assert.Equal(HttpStatusCode.OK, refreshed.Response.StatusCode);
        Assert.Equal(SigningTask, refreshed.Data.Model!.Process.CurrentTask!.ElementId);
        Assert.Equal(ProcessStatus.Idle, refreshed.Data.Model.Process.Status);
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
                Assert.Equal(NotificationStatus.Sent, signee.NotificationStatus);
                Assert.Null(signee.NotificationFailure);
            }
        );
        return stateElement.Id;
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
        Assert.Equal(5, callbacks.Select(callback => callback.StepId).Distinct().Count());
        foreach (var group in callbacks.GroupBy(callback => callback.StepId))
        {
            var attempts = group.ToArray();
            Assert.Equal(attempts[0].CommandKey == commandKey ? expectedAttempts : 1, attempts.Length);
            Assert.All(attempts, callback => Assert.Equal(attempts[0].WorkflowId, callback.WorkflowId));
        }
    }

    private static CallbackAttempt[] SigningCallbacks(ScenarioState state) =>
        state
            .Callbacks.Where(callback =>
                !callback.Deferred
                && callback.CommandKey is "ResolveSignees" or "DelegateSigneeRights" or "NotifySignee"
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
        string? loseCallbackResponseOnce = null,
        bool changeSigneesOnProviderRetry = false,
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
                    loseCallbackResponseOnce,
                    signeesOnProviderRetry = changeSigneesOnProviderRetry ? new[] { SecondPerson } : null,
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
        int LostCallbackResponses,
        string[] ResolvedStateElementIds,
        Guid[][] ResolvedSigneeIds,
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
        int StatusCode,
        bool Deferred
    );
}
