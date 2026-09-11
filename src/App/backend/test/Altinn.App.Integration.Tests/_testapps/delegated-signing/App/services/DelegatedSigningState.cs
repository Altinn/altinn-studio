#nullable enable

using System.Net;
using System.Text.Json;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using TestApp.Shared;

namespace TestApp.DelegatedSigning;

public sealed record FailureRequest
{
    public int RecipientNumber { get; init; } = 2;
    public int RemainingFailures { get; set; } = 1;
    public int StatusCode { get; init; } = 503;
    public bool AfterSuccess { get; init; }
}

public sealed record ResetSigningRequest
{
    public string[] Signees { get; init; } = ["01899699552", "17858296439"];
    public string[]? SigneesOnProviderRetry { get; init; }
    public string? LoseCallbackResponseOnce { get; set; }
    public bool HoldProvider { get; set; }
    public bool ProviderContractFailure { get; set; }
    public bool LoseResolveResponseOnce { get; set; }
    public bool LoseAbortResponseOnce { get; set; }
    public FailureRequest? DelegationFailure { get; set; }
    public FailureRequest? NotificationFailure { get; set; }
}

public sealed record DelegationAttempt(
    string InstanceId,
    string Recipient,
    int Attempt,
    bool Forwarded,
    int StatusCode
);

public sealed record RevocationAttempt(string InstanceId, string Recipient, int StatusCode);

public sealed record NotificationAttempt(
    string InstanceId,
    string Recipient,
    Guid IdempotencyKey,
    int Attempt,
    bool Accepted,
    bool Duplicate,
    int StatusCode
);

public sealed record CallbackAttempt(
    string CommandKey,
    Guid WorkflowId,
    Guid StepId,
    int RetryCount,
    int StatusCode,
    bool Deferred
);

// This ledger represents external acceptance, so it deliberately survives failed app callbacks and /allow.
internal sealed class DelegatedSigningState : IEndpointConfigurator
{
    private readonly object _gate = new();
    private ResetSigningRequest _plan = new();
    private int _providerCalls;
    private int _lostResolveResponses;
    private int _lostCallbackResponses;
    private readonly List<string> _resolvedStateElementIds = [];
    private readonly List<Guid[]> _resolvedSigneeIds = [];
    private int _lostAbortResponses;
    private readonly List<DelegationAttempt> _delegations = [];
    private readonly List<RevocationAttempt> _revocations = [];
    private readonly List<NotificationAttempt> _notifications = [];
    private readonly List<CallbackAttempt> _callbacks = [];
    private readonly HashSet<Guid> _acceptedNotifications = [];
    private readonly Dictionary<string, List<string>> _delegationRecipients = [];

    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/delegated-signing/reset",
            (ResetSigningRequest request) =>
            {
                lock (_gate)
                {
                    _plan = request;
                    _providerCalls = 0;
                    _lostResolveResponses = 0;
                    _lostCallbackResponses = 0;
                    _resolvedStateElementIds.Clear();
                    _resolvedSigneeIds.Clear();
                    _lostAbortResponses = 0;
                    _delegations.Clear();
                    _revocations.Clear();
                    _notifications.Clear();
                    _callbacks.Clear();
                    _acceptedNotifications.Clear();
                    _delegationRecipients.Clear();
                }
                return Results.Ok();
            }
        );
        app.MapPost(
            "/test/delegated-signing/allow",
            () =>
            {
                lock (_gate)
                {
                    _plan.HoldProvider = false;
                    _plan.ProviderContractFailure = false;
                    _plan.LoseResolveResponseOnce = false;
                    _plan.LoseCallbackResponseOnce = null;
                    _plan.LoseAbortResponseOnce = false;
                    _plan.DelegationFailure = null;
                    _plan.NotificationFailure = null;
                }
                return Results.Ok();
            }
        );
        app.MapGet(
            "/test/delegated-signing/state",
            () =>
            {
                lock (_gate)
                {
                    return Results.Ok(
                        new
                        {
                            providerCalls = _providerCalls,
                            delegations = _delegations.ToArray(),
                            revocations = _revocations.ToArray(),
                            notifications = _notifications.ToArray(),
                            callbacks = _callbacks.ToArray(),
                            acceptedNotificationCount = _acceptedNotifications.Count,
                            lostResolveResponses = _lostResolveResponses,
                            lostCallbackResponses = _lostCallbackResponses,
                            resolvedStateElementIds = _resolvedStateElementIds.ToArray(),
                            resolvedSigneeIds = _resolvedSigneeIds.ToArray(),
                            lostAbortResponses = _lostAbortResponses,
                        }
                    );
                }
            }
        );
    }

    public string ProviderId
    {
        get
        {
            lock (_gate)
                return _plan.ProviderContractFailure ? "missing-provider" : "integration-signees";
        }
    }

    public SigneeProviderResult GetSignees()
    {
        lock (_gate)
        {
            _providerCalls++;
            if (_plan.HoldProvider)
                throw new HttpRequestException(
                    "Injected provider unavailability",
                    null,
                    HttpStatusCode.ServiceUnavailable
                );
            return new SigneeProviderResult
            {
                Signees = (_providerCalls > 1 ? _plan.SigneesOnProviderRetry ?? _plan.Signees : _plan.Signees)
                    .Select(
                        (ssn, index) =>
                            (ProvidedSignee)
                                new ProvidedPerson
                                {
                                    SocialSecurityNumber = ssn,
                                    FullName = $"Integration signee {index + 1}",
                                    AdditionalActionsToDelegate = ["reject"],
                                }
                    )
                    .ToList(),
            };
        }
    }

    public (int Attempt, FailureRequest? Failure) BeginDelegation(string instanceId, string recipient)
    {
        lock (_gate)
        {
            if (!_delegationRecipients.TryGetValue(instanceId, out var recipients))
                _delegationRecipients[instanceId] = recipients = [];
            if (!recipients.Contains(recipient))
                recipients.Add(recipient);
            int attempt = _delegations.Count(x => x.InstanceId == instanceId && x.Recipient == recipient) + 1;
            return (attempt, TakeFailure(_plan.DelegationFailure, recipients.IndexOf(recipient) + 1));
        }
    }

    public void RecordDelegation(DelegationAttempt attempt)
    {
        lock (_gate)
            _delegations.Add(attempt);
    }

    public void RecordRevocation(RevocationAttempt attempt)
    {
        lock (_gate)
            _revocations.Add(attempt);
    }

    /// <summary>
    /// Decides what the transport wrapper does with one call to action before it is forwarded to localtest's
    /// Correspondence emulation: the attempt number, whether this key was already accepted (localtest will answer
    /// 409, so no failure is consumed), and the failure rule to inject, if any.
    /// </summary>
    public (int Attempt, bool AlreadyAccepted, FailureRequest? Failure) PlanNotification(
        string instanceId,
        string recipient,
        Guid key
    )
    {
        lock (_gate)
        {
            int attempt = _notifications.Count(x => x.InstanceId == instanceId && x.Recipient == recipient) + 1;
            bool alreadyAccepted = _acceptedNotifications.Contains(key);
            var failure = alreadyAccepted
                ? null
                : TakeFailure(
                    _plan.NotificationFailure,
                    Array.FindIndex(_plan.Signees, ssn => recipient.EndsWith($":{ssn}", StringComparison.Ordinal)) + 1
                );
            return (attempt, alreadyAccepted, failure);
        }
    }

    /// <summary>
    /// Records the outcome of one call to action. Accepted means localtest stored the message, whether or not the
    /// app was shown that response; a later attempt with the same key is then a duplicate.
    /// </summary>
    public void RecordNotification(NotificationAttempt attempt)
    {
        lock (_gate)
        {
            if (attempt.Accepted)
                _acceptedNotifications.Add(attempt.IdempotencyKey);
            _notifications.Add(attempt);
        }
    }

    public int RecordCallback(
        AppCallbackPayload payload,
        string commandKey,
        int statusCode,
        bool deferred = false,
        string? publishedState = null
    )
    {
        lock (_gate)
        {
            if (commandKey == "ResolveSignees" && statusCode is >= 200 and < 300 && publishedState is not null)
            {
                // Inspect the exact successful response before simulating its loss. It contains the
                // authoritative aggregate result, including on a Storage replay of this callback.
                var envelope = JsonSerializer.Deserialize<SignedWorkflowState>(publishedState)!;
                var snapshot = JsonSerializer.Deserialize<WorkflowCallbackState>(envelope.Payload)!;
                var entry = snapshot.TaskStateData!.Single(data => data.DataType == "signee-states");
                var contexts = JsonSerializer.Deserialize<List<SigneeContext>>(
                    entry.Data,
                    SigneeStateSerialization.Options
                )!;
                _resolvedStateElementIds.Add(entry.Id);
                _resolvedSigneeIds.Add(contexts.Select(context => context.SigneeId!.Value).ToArray());
            }
            if (commandKey == _plan.LoseCallbackResponseOnce && statusCode is >= 200 and < 300)
            {
                _plan.LoseCallbackResponseOnce = null;
                _lostCallbackResponses++;
                statusCode = 503;
            }
            if (commandKey == "ResolveSignees" && statusCode is >= 200 and < 300 && _plan.LoseResolveResponseOnce)
            {
                _plan.LoseResolveResponseOnce = false;
                _lostResolveResponses++;
                statusCode = 503;
            }
            if (
                commandKey == "AbortRuntimeDelegatedSigning"
                && statusCode is >= 200 and < 300
                && _plan.LoseAbortResponseOnce
            )
            {
                _plan.LoseAbortResponseOnce = false;
                _lostAbortResponses++;
                statusCode = 503;
            }
            _callbacks.Add(
                new(commandKey, payload.WorkflowId, payload.StepId, payload.RetryCount, statusCode, deferred)
            );
            return statusCode;
        }
    }

    private static FailureRequest? TakeFailure(FailureRequest? rule, int recipientNumber)
    {
        if (rule is null || rule.RecipientNumber != recipientNumber || rule.RemainingFailures == 0)
            return null;
        if (rule.RemainingFailures > 0)
            rule.RemainingFailures--;
        return rule with { };
    }
}
