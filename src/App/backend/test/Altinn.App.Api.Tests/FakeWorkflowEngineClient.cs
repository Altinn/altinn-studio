using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Infrastructure.Authentication;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Api.Tests;

/// <summary>
/// In-process implementation of <see cref="IWorkflowEngineClient"/> for API tests.
/// Simulates the workflow engine by calling <see cref="WorkflowEngineCallbackController"/>
/// directly per command while keeping an in-memory workflow store for polling and failure handling.
/// </summary>
/// <remarks>
/// Each callback runs as a request of its own, as the engine sends it (see <see cref="WorkflowCallbackHttpContextAccessor"/>):
/// it sees neither the query string nor the user of the request that enqueued its workflow.
/// Time is compressed rather than simulated: a deferring step re-executes immediately with the
/// requested delay added to a virtual elapsed wait, so a test of a long wait finishes in milliseconds.
/// The consequence worth knowing is that a workflow never actually rests in
/// <see cref="PersistentItemStatus.Waiting"/> here, so the early release of a parked
/// <c>process/next</c> is not covered — that needs the integration suite and a real engine.
/// A mailbox receive workflow does rest in <see cref="PersistentItemStatus.Held"/>, as the engine's does: it takes the
/// next position in the receivers log when it is enqueued, and runs once the delivery at that position arrives or the
/// mailbox closes. <see cref="ExpireMailbox"/> stands in for the deadline sweep.
/// </remarks>
internal sealed class FakeWorkflowEngineClient : IWorkflowEngineClient
{
    /// <summary>The engine's own default when a step declares no wait budget.</summary>
    private static readonly TimeSpan DefaultStepWaitBudget = TimeSpan.FromDays(1);

    /// <summary>
    /// Loop guard: with the wait compressed, a handler that defers without observing its wait clocks
    /// would spin forever. Set well above what a day-long budget costs a handler backing off in
    /// minutes, so only a genuinely unbounded wait trips it.
    /// </summary>
    private const int MaxDeferralsPerStep = 1000;
    private const int MaxRetriesOfAThrowingStep = 10;

    /// <summary>The engine's default <c>MaxMailboxLogLength</c>: deliveries a mailbox accepts in its lifetime.</summary>
    private const int MaxMailboxLogLength = 100;

    private readonly IServiceProvider _serviceProvider;
    private readonly ConcurrentDictionary<Guid, StoredWorkflow> _workflows = new();
    private readonly ConcurrentDictionary<string, Guid[]> _workflowsByIdempotencyKey = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, string> _fingerprintsByIdempotencyKey = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, List<Guid>> _collectionHeadsByKey = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, MailboxResponse> _mailboxesByIdempotencyKey = new(
        StringComparer.Ordinal
    );
    private readonly ConcurrentDictionary<string, MailboxDeliveryResponse> _deliveriesByKey = new(
        StringComparer.Ordinal
    );
    private readonly ConcurrentDictionary<(Guid MailboxId, long Idx), StoredDelivery> _deliveriesByPosition = new();
    private readonly object _gate = new();
    private bool _isProcessing;
    private Func<FakeStepRun, bool>? _loseNextAnswer;
    private Func<WorkflowEnqueueRequest, bool>? _failNextEnqueue;
    private Func<FakeStepRun, bool>? _overlapNextRun;
    private Func<Task>? _runTheStepAgain;
    private IActionResult? _overlappingAnswer;

    public FakeWorkflowEngineClient(
        IServiceProvider serviceProvider,
        WorkflowCallbackStateService workflowCallbackStateService
    )
    {
        _serviceProvider = serviceProvider;
        _ = workflowCallbackStateService;
    }

    public async Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
        string ns,
        string idempotencyKey,
        string? collectionKey,
        WorkflowEnqueueRequest request,
        CancellationToken cancellationToken = default
    )
    {
        if (_failNextEnqueue is { } failEnqueue && failEnqueue(request))
        {
            _failNextEnqueue = null;
            FailedEnqueues++;
            throw new HttpRequestException(
                "The engine could not be reached.",
                inner: null,
                HttpStatusCode.ServiceUnavailable
            );
        }

        string batchKey = CreateBatchKey(ns, idempotencyKey);
        string fingerprint = CreateFingerprint(collectionKey, request);
        if (_workflowsByIdempotencyKey.TryGetValue(batchKey, out Guid[]? existingWorkflowIds))
        {
            if (_fingerprintsByIdempotencyKey[batchKey] != fingerprint)
            {
                // What the engine answers when a used key comes with other work.
                throw new HttpRequestException(
                    $"Idempotency key {idempotencyKey} was used for another request.",
                    inner: null,
                    HttpStatusCode.Conflict
                );
            }

            return new WorkflowEnqueueResponse.Accepted
            {
                Workflows = existingWorkflowIds.Select(workflowId => ToWorkflowResult(_workflows[workflowId])).ToList(),
            };
        }

        AppWorkflowContext context = request.Context is { } requestContext
            ? JsonSerializer.Deserialize<AppWorkflowContext>(requestContext)
                ?? throw new InvalidOperationException("Failed to deserialize AppWorkflowContext from request")
            : throw new InvalidOperationException("WorkflowEnqueueRequest.Context is required");

        Dictionary<string, Guid> refMap = new(StringComparer.Ordinal);
        List<StoredWorkflow> createdWorkflows = [];
        Guid[] currentCollectionHeads =
            !string.IsNullOrWhiteSpace(collectionKey)
            && _collectionHeadsByKey.TryGetValue(CreateCollectionLookupKey(ns, collectionKey), out List<Guid>? heads)
                ? [.. heads]
                : [];

        foreach (WorkflowRequest workflow in request.Workflows)
        {
            Guid databaseId = Guid.NewGuid();
            DateTimeOffset createdAt = DateTimeOffset.UtcNow;
            if (workflow.Ref is not null)
            {
                refMap[workflow.Ref] = databaseId;
            }

            long? mailboxSeq = workflow.Mailbox is { } mailboxReference ? TakeReceiverSeq(mailboxReference.Id) : null;
            bool held = workflow.Mailbox is { } receiverMailbox && !CanReceive(receiverMailbox.Id, mailboxSeq ?? 0);
            bool isCollectionRoot = workflow.DependsOn is null || workflow.DependsOn.All(dependency => dependency.IsId);
            List<Guid> dependencyIds = ResolveWorkflowRefs(workflow.DependsOn, refMap);
            // Mirrors the engine: only roots that opted in via DependsOnHeads pick up the current
            // collection heads as dependencies. A DependsOnHeads=false root (e.g. an auxiliary
            // workflow enqueued after the task start) starts independently.
            if (isCollectionRoot && workflow.DependsOnHeads)
            {
                foreach (Guid headId in currentCollectionHeads)
                {
                    if (!dependencyIds.Contains(headId))
                    {
                        dependencyIds.Add(headId);
                    }
                }
            }

            createdWorkflows.Add(
                new StoredWorkflow
                {
                    DatabaseId = databaseId,
                    Ref = workflow.Ref,
                    IsHead = workflow.IsHead,
                    StartAt = workflow.StartAt,
                    Namespace = ns,
                    CollectionKey = collectionKey,
                    IdempotencyKey = idempotencyKey,
                    OperationId = workflow.OperationId,
                    Labels = request.Labels,
                    Context = context,
                    InitialState = workflow.State,
                    State = workflow.State,
                    DependencyIds = dependencyIds,
                    LinkIds = ResolveWorkflowRefs(workflow.Links, refMap),
                    Steps = workflow
                        .Steps.Select(
                            (step, index) =>
                                new StoredStep
                                {
                                    DatabaseId = Guid.NewGuid(),
                                    OperationId = step.OperationId,
                                    ProcessingOrder = index,
                                    Labels = step.Labels,
                                    CommandType = step.Command.Type,
                                    CommandData = step.Command.Data,
                                    RetryStrategy = step.RetryStrategy,
                                    WaitBudget = step.Command.WaitBudget,
                                    MaxExecutionTime = step.Command.MaxExecutionTime,
                                    CreatedAt = createdAt,
                                }
                        )
                        .ToList(),
                    CreatedAt = createdAt,
                    UpdatedAt = createdAt,
                    MailboxId = workflow.Mailbox?.Id,
                    MailboxSeq = mailboxSeq,
                    Status = held ? PersistentItemStatus.Held : PersistentItemStatus.Enqueued,
                }
            );
        }

        foreach (StoredWorkflow workflow in createdWorkflows)
        {
            _workflows[workflow.DatabaseId] = workflow;
        }

        _workflowsByIdempotencyKey[batchKey] = createdWorkflows.Select(workflow => workflow.DatabaseId).ToArray();
        _fingerprintsByIdempotencyKey[batchKey] = fingerprint;
        if (!string.IsNullOrWhiteSpace(collectionKey))
        {
            UpdateCollectionHeads(ns, collectionKey, currentCollectionHeads, createdWorkflows);
        }

        await ProcessAvailableWorkflows(cancellationToken);

        return new WorkflowEnqueueResponse.Accepted { Workflows = createdWorkflows.Select(ToWorkflowResult).ToList() };
    }

    /// <summary>
    /// Loses the answer of the next step run that <paramref name="step"/> matches, once that run's callback has saved and
    /// relayed, so the step runs again with the same payload, as the engine retries a step whose answer it never got.
    /// </summary>
    public void LoseNextAnswer(Func<FakeStepRun, bool> step) => _loseNextAnswer = step;

    /// <summary>How many step answers <see cref="LoseNextAnswer"/> lost.</summary>
    public int LostAnswers { get; private set; }

    /// <summary>Answers the next enqueue that <paramref name="request"/> matches as an engine that cannot be reached.</summary>
    public void FailNextEnqueue(Func<WorkflowEnqueueRequest, bool> request) => _failNextEnqueue = request;

    /// <summary>How many enqueues <see cref="FailNextEnqueue"/> failed.</summary>
    public int FailedEnqueues { get; private set; }

    /// <summary>
    /// Lets <see cref="RunTheStepAgainNow"/> start a second run of the next step run that <paramref name="step"/>
    /// matches, with the same payload, while the first is still in its callback, as the engine does when it times out a
    /// run and retries the step. The engine takes the second run's answer, whatever the first answers.
    /// </summary>
    public void OverlapNextRun(Func<FakeStepRun, bool> step) => _overlapNextRun = step;

    /// <summary>Runs the step that <see cref="OverlapNextRun"/> matched again, to the end of its callback.</summary>
    public Task RunTheStepAgainNow() =>
        (_runTheStepAgain ?? throw new InvalidOperationException("No step run is open to overlap."))();

    /// <summary>How many step runs <see cref="RunTheStepAgainNow"/> overlapped.</summary>
    public int OverlappedRuns { get; private set; }

    /// <summary>Whether a workflow failed, or could not run because one it depends on failed.</summary>
    public bool HasFailedWorkflow =>
        _workflows.Values.Any(workflow =>
            workflow.Status is PersistentItemStatus.Failed or PersistentItemStatus.DependencyFailed
        );

    /// <summary>
    /// The work an enqueue request is checked against when its key was used before, as the engine computes it: the
    /// collection, steps, commands, dependencies and schedule, without the state, context and labels.
    /// </summary>
    private static string CreateFingerprint(string? collectionKey, WorkflowEnqueueRequest request) =>
        JsonSerializer.Serialize(
            new
            {
                collectionKey,
                Workflows = request.Workflows.Select(workflow => new
                {
                    workflow.Ref,
                    workflow.OperationId,
                    Steps = workflow.Steps.Select(step => new
                    {
                        step.OperationId,
                        step.Command,
                        step.RetryStrategy,
                    }),
                    workflow.StartAt,
                    workflow.DependsOn,
                    workflow.Links,
                    workflow.DependsOnHeads,
                    workflow.IsHead,
                    workflow.Mailbox,
                }),
            }
        );

    public Task<WorkflowCollectionDetailResponse?> GetCollection(
        string ns,
        string key,
        CancellationToken cancellationToken = default
    )
    {
        if (!_collectionHeadsByKey.TryGetValue(CreateCollectionLookupKey(ns, key), out List<Guid>? headIds))
        {
            return Task.FromResult<WorkflowCollectionDetailResponse?>(null);
        }

        List<StoredWorkflow> collectionWorkflows = _workflows
            .Values.Where(workflow => workflow.Namespace == ns && workflow.CollectionKey == key)
            .OrderBy(workflow => workflow.CreatedAt)
            .ToList();
        if (collectionWorkflows.Count == 0)
        {
            return Task.FromResult<WorkflowCollectionDetailResponse?>(null);
        }

        WorkflowCollectionDetailResponse collection = new()
        {
            Key = key,
            Namespace = ns,
            Heads = headIds
                .Where(headId =>
                    _workflows.TryGetValue(headId, out StoredWorkflow? workflow) && workflow.Namespace == ns
                )
                .Select(headId =>
                {
                    StoredWorkflow workflow = _workflows[headId];
                    return new CollectionHeadStatus
                    {
                        DatabaseId = headId,
                        Status = workflow.Status,
                        Labels = workflow.Labels is null ? null : new Dictionary<string, string>(workflow.Labels),
                        StepsCompleted = workflow.Steps.Count(step => step.Status == PersistentItemStatus.Completed),
                        StepsTotal = workflow.Steps.Count,
                    };
                })
                .ToList(),
            CreatedAt = collectionWorkflows[0].CreatedAt,
            UpdatedAt = collectionWorkflows.Max(workflow => workflow.UpdatedAt),
        };

        return Task.FromResult<WorkflowCollectionDetailResponse?>(collection);
    }

    public Task<WorkflowStatusResponse?> GetWorkflow(
        string ns,
        Guid workflowId,
        CancellationToken cancellationToken = default
    )
    {
        return Task.FromResult(
            _workflows.TryGetValue(workflowId, out StoredWorkflow? workflow) && workflow.Namespace == ns
                ? ToWorkflowStatusResponse(workflow)
                : null
        );
    }

    public Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
        string ns,
        string? collectionKey = null,
        Dictionary<string, string>? labels = null,
        IReadOnlyList<PersistentItemStatus>? statuses = null,
        CancellationToken cancellationToken = default
    )
    {
        IEnumerable<StoredWorkflow> matching = _workflows.Values.Where(workflow => workflow.Namespace == ns);

        if (!string.IsNullOrWhiteSpace(collectionKey))
        {
            matching = matching.Where(workflow => workflow.CollectionKey == collectionKey);
        }

        if (labels is not null)
        {
            matching = matching.Where(workflow => LabelsMatch(workflow.Labels, labels));
        }

        if (statuses is not null)
        {
            HashSet<PersistentItemStatus> statusSet = [.. statuses];
            matching = matching.Where(workflow => statusSet.Contains(workflow.Status));
        }

        IReadOnlyList<WorkflowStatusResponse> result = matching
            .OrderBy(workflow => workflow.CreatedAt)
            .Select(ToWorkflowStatusResponse)
            .ToList();

        return Task.FromResult(result);
    }

    public Task<CancelWorkflowResponse> CancelWorkflow(
        string ns,
        Guid workflowId,
        CancellationToken cancellationToken = default
    )
    {
        if (_workflows.TryGetValue(workflowId, out StoredWorkflow? workflow))
        {
            workflow.Status = PersistentItemStatus.Canceled;
            workflow.UpdatedAt = DateTimeOffset.UtcNow;
        }

        return Task.FromResult(new CancelWorkflowResponse(workflowId, DateTimeOffset.UtcNow, true));
    }

    public async Task<ResumeWorkflowResponse> ResumeWorkflow(
        string ns,
        Guid workflowId,
        bool cascade = false,
        CancellationToken cancellationToken = default
    )
    {
        if (_workflows.TryGetValue(workflowId, out StoredWorkflow? workflow))
        {
            ResetWorkflowForResume(workflow);

            if (cascade)
            {
                foreach (
                    StoredWorkflow dependent in _workflows.Values.Where(candidate =>
                        candidate.DependencyIds.Contains(workflowId)
                    )
                )
                {
                    ResetWorkflowForResume(dependent);
                }
            }

            await ProcessAvailableWorkflows(cancellationToken);
        }

        return new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []);
    }

    /// <summary>
    /// Mints idempotently on <c>(namespace, idempotencyKey)</c>, as the engine does. The fake models the
    /// address, not the rendezvous.
    /// </summary>
    public Task<MailboxMintResult> MintMailbox(
        string ns,
        MailboxCreateRequest request,
        CancellationToken cancellationToken = default
    )
    {
        MailboxResponse mailbox = _mailboxesByIdempotencyKey.GetOrAdd(
            CreateBatchKey(ns, request.IdempotencyKey),
            _ =>
            {
                DateTimeOffset now = DateTimeOffset.UtcNow;
                return new MailboxResponse
                {
                    Id = Guid.CreateVersion7(now),
                    Namespace = ns,
                    IdempotencyKey = request.IdempotencyKey,
                    CollectionKey = request.CollectionKey,
                    Timeout = request.Timeout,
                    Deadline = now + request.Timeout,
                    Status = MailboxStatus.Open,
                    NextIdx = 0,
                    NextSeq = 0,
                    CreatedAt = now,
                };
            }
        );

        return Task.FromResult<MailboxMintResult>(new MailboxMintResult.Minted(mailbox));
    }

    public Task<MailboxResponse?> GetMailbox(
        string ns,
        Guid mailboxId,
        CancellationToken cancellationToken = default
    ) =>
        Task.FromResult(
            _mailboxesByIdempotencyKey.Values.FirstOrDefault(mailbox =>
                mailbox.Id == mailboxId && string.Equals(mailbox.Namespace, ns, StringComparison.Ordinal)
            )
        );

    /// <summary>
    /// Terminal and idempotent as the engine is; <c>null</c> for an unknown id (the engine's <c>404</c>).
    /// </summary>
    public Task<MailboxResponse?> CloseMailbox(string ns, Guid mailboxId, CancellationToken cancellationToken = default)
    {
        foreach ((string key, MailboxResponse mailbox) in _mailboxesByIdempotencyKey)
        {
            if (mailbox.Id != mailboxId || !string.Equals(mailbox.Namespace, ns, StringComparison.Ordinal))
            {
                continue;
            }

            if (mailbox.Status == MailboxStatus.Disposed)
            {
                return Task.FromResult<MailboxResponse?>(mailbox);
            }

            MailboxResponse closed = mailbox with
            {
                Status = MailboxStatus.Disposed,
                DisposedReason = MailboxDisposedReason.Request,
                DisposedAt = DateTimeOffset.UtcNow,
            };
            _mailboxesByIdempotencyKey.TryUpdate(key, closed, mailbox);
            MarkReceiversRunnable(mailboxId);
            return Task.FromResult<MailboxResponse?>(closed);
        }

        return Task.FromResult<MailboxResponse?>(null);
    }

    /// <summary>
    /// Models the engine's response matrix: <c>404</c> unknown, <c>409</c> closed, <c>200</c> replay (even
    /// after closure), <c>429</c> past the log limit, <c>202</c> appended. An appended delivery runs the receiver held
    /// at its position.
    /// </summary>
    public async Task<MailboxDeliveryResult> DeliverToMailbox(
        string ns,
        Guid mailboxId,
        MailboxDeliveryRequest request,
        CancellationToken cancellationToken = default
    )
    {
        string deliveryKey = CreateBatchKey(mailboxId.ToString(), request.IdempotencyKey);

        // The idempotency lookup runs before the closed check, exactly as the engine's does.
        if (_deliveriesByKey.TryGetValue(deliveryKey, out MailboxDeliveryResponse? existing))
        {
            return new MailboxDeliveryResult(HttpStatusCode.OK, existing, ErrorDetail: null);
        }

        foreach ((string key, MailboxResponse mailbox) in _mailboxesByIdempotencyKey)
        {
            if (mailbox.Id != mailboxId || !string.Equals(mailbox.Namespace, ns, StringComparison.Ordinal))
            {
                continue;
            }

            if (mailbox.Status == MailboxStatus.Disposed)
            {
                return new MailboxDeliveryResult(
                    HttpStatusCode.Conflict,
                    Body: null,
                    ErrorDetail: $"Mailbox {mailboxId} is closed and no longer accepts deliveries."
                );
            }

            if (mailbox.NextIdx >= MaxMailboxLogLength)
            {
                return new MailboxDeliveryResult(
                    HttpStatusCode.TooManyRequests,
                    Body: null,
                    ErrorDetail: $"Mailbox {mailboxId} has taken {MaxMailboxLogLength} messages."
                );
            }

            var delivery = new MailboxDeliveryResponse
            {
                MailboxId = mailboxId,
                Idx = mailbox.NextIdx,
                IdempotencyKey = request.IdempotencyKey,
                AcceptedAt = DateTimeOffset.UtcNow,
            };
            _deliveriesByKey[deliveryKey] = delivery;
            _deliveriesByPosition[(mailboxId, delivery.Idx)] = new StoredDelivery(delivery, request.Payload);
            _mailboxesByIdempotencyKey.TryUpdate(key, mailbox with { NextIdx = mailbox.NextIdx + 1 }, mailbox);

            await WakeReceivers(mailboxId, cancellationToken);
            return new MailboxDeliveryResult(HttpStatusCode.Accepted, delivery, ErrorDetail: null);
        }

        return new MailboxDeliveryResult(HttpStatusCode.NotFound, Body: null, ErrorDetail: null);
    }

    /// <summary>
    /// Closes the mailbox as the engine's deadline sweep does, and runs the receiver that waits on it with the closing
    /// signal.
    /// </summary>
    public async Task ExpireMailbox(Guid mailboxId, CancellationToken cancellationToken = default)
    {
        foreach ((string key, MailboxResponse mailbox) in _mailboxesByIdempotencyKey)
        {
            if (mailbox.Id == mailboxId && mailbox.Status != MailboxStatus.Disposed)
            {
                _mailboxesByIdempotencyKey.TryUpdate(
                    key,
                    mailbox with
                    {
                        Status = MailboxStatus.Disposed,
                        DisposedReason = MailboxDisposedReason.Deadline,
                        DisposedAt = DateTimeOffset.UtcNow,
                    },
                    mailbox
                );
            }
        }

        await WakeReceivers(mailboxId, cancellationToken);
    }

    /// <summary>The receiver position the next receive workflow for the mailbox gets, as the engine assigns it.</summary>
    private long TakeReceiverSeq(Guid mailboxId)
    {
        foreach ((string key, MailboxResponse mailbox) in _mailboxesByIdempotencyKey)
        {
            if (mailbox.Id == mailboxId)
            {
                _mailboxesByIdempotencyKey.TryUpdate(key, mailbox with { NextSeq = mailbox.NextSeq + 1 }, mailbox);
                return mailbox.NextSeq;
            }
        }

        throw new InvalidOperationException($"A receive workflow names mailbox {mailboxId}, which does not exist.");
    }

    /// <summary>Whether the receiver at <paramref name="seq"/> has its delivery, or the mailbox has closed.</summary>
    private bool CanReceive(Guid mailboxId, long seq) =>
        _deliveriesByPosition.ContainsKey((mailboxId, seq))
        || _mailboxesByIdempotencyKey.Values.Any(mailbox =>
            mailbox.Id == mailboxId && mailbox.Status == MailboxStatus.Disposed
        );

    private async Task WakeReceivers(Guid mailboxId, CancellationToken cancellationToken)
    {
        MarkReceiversRunnable(mailboxId);
        await ProcessAvailableWorkflows(cancellationToken);
    }

    private void MarkReceiversRunnable(Guid mailboxId)
    {
        lock (_gate)
        {
            foreach (StoredWorkflow receiver in _workflows.Values)
            {
                if (
                    receiver is { Status: PersistentItemStatus.Held, MailboxSeq: { } seq }
                    && receiver.MailboxId == mailboxId
                    && CanReceive(mailboxId, seq)
                )
                {
                    receiver.Status = PersistentItemStatus.Enqueued;
                    receiver.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }
        }
    }

    /// <summary>What the receiver's first step is told: its delivery, or that none can come.</summary>
    private AppCallbackMailbox? CreateRendezvous(StoredWorkflow workflow)
    {
        if (workflow is not { MailboxId: { } mailboxId, MailboxSeq: { } seq })
        {
            return null;
        }

        if (_deliveriesByPosition.TryGetValue((mailboxId, seq), out StoredDelivery? delivery))
        {
            return new AppCallbackMailbox
            {
                Id = mailboxId,
                Seq = seq,
                Delivery = new AppCallbackMailboxDelivery
                {
                    IdempotencyKey = delivery.Response.IdempotencyKey,
                    Payload = delivery.Payload,
                    AcceptedAt = delivery.Response.AcceptedAt,
                },
            };
        }

        MailboxResponse mailbox = _mailboxesByIdempotencyKey.Values.Single(candidate => candidate.Id == mailboxId);
        return new AppCallbackMailbox
        {
            Id = mailboxId,
            Seq = seq,
            DisposedReason = mailbox.DisposedReason,
        };
    }

    private async Task ProcessAvailableWorkflows(CancellationToken cancellationToken)
    {
        lock (_gate)
        {
            if (_isProcessing)
            {
                return;
            }

            _isProcessing = true;
        }

        try
        {
            while (true)
            {
                MarkDependencyFailures();
                StoredWorkflow? workflow = TryGetNextRunnableWorkflow();
                if (workflow is null)
                {
                    return;
                }

                await ExecuteWorkflow(workflow, cancellationToken);
            }
        }
        finally
        {
            lock (_gate)
            {
                _isProcessing = false;
            }
        }
    }

    private StoredWorkflow? TryGetNextRunnableWorkflow()
    {
        lock (_gate)
        {
            return _workflows
                .Values.Where(workflow =>
                    workflow.Status is PersistentItemStatus.Enqueued or PersistentItemStatus.Requeued
                )
                .Where(workflow =>
                    workflow.DependencyIds.All(dependencyId =>
                        _workflows.TryGetValue(dependencyId, out StoredWorkflow? dependency)
                        // Abandoned satisfies a dependency: terminal, and its failure is written off.
                        && dependency.Status is PersistentItemStatus.Completed or PersistentItemStatus.Abandoned
                    )
                )
                .OrderBy(workflow => workflow.CreatedAt)
                .FirstOrDefault();
        }
    }

    private void MarkDependencyFailures()
    {
        lock (_gate)
        {
            foreach (StoredWorkflow workflow in _workflows.Values)
            {
                if (workflow.Status is not (PersistentItemStatus.Enqueued or PersistentItemStatus.Requeued))
                {
                    continue;
                }

                if (
                    workflow.DependencyIds.Any(dependencyId =>
                        _workflows.TryGetValue(dependencyId, out StoredWorkflow? dependency)
                        && dependency.Status
                            is PersistentItemStatus.Failed
                                or PersistentItemStatus.Canceled
                                or PersistentItemStatus.DependencyFailed
                    )
                )
                {
                    workflow.Status = PersistentItemStatus.DependencyFailed;
                    workflow.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }
        }
    }

    private async Task ExecuteWorkflow(StoredWorkflow workflow, CancellationToken cancellationToken)
    {
        lock (_gate)
        {
            workflow.Status = PersistentItemStatus.Processing;
            workflow.UpdatedAt = DateTimeOffset.UtcNow;
        }

        string? currentState = workflow.State;

        foreach (StoredStep step in workflow.Steps)
        {
            if (step.Status == PersistentItemStatus.Completed)
            {
                currentState = step.StateOut;
                continue;
            }

            if (step.CommandType != "app")
            {
                MarkStepCompleted(step, currentState);
                continue;
            }

            AppCommandData appCommandData =
                JsonSerializer.Deserialize<AppCommandData>(
                    step.CommandData ?? throw new InvalidOperationException("App command data is required.")
                ) ?? throw new InvalidOperationException("Failed to deserialize AppCommandData");

            if (IsAltinnEventCommand(appCommandData.CommandKey))
            {
                MarkStepCompleted(step, currentState);
                continue;
            }

            while (true)
            {
                step.Status = PersistentItemStatus.Processing;
                step.UpdatedAt = DateTimeOffset.UtcNow;

                DateTimeOffset attemptStartedAt = DateTimeOffset.UtcNow;
                TimeSpan waitBudget = step.WaitBudget ?? DefaultStepWaitBudget;
                AppCallbackPayload payload = new()
                {
                    CommandKey = appCommandData.CommandKey,
                    Actor = workflow.Context.Actor,
                    Payload = appCommandData.Payload,
                    State = currentState,
                    WorkflowId = workflow.DatabaseId,
                    StepId = step.DatabaseId,
                    ExecutionReferenceTime = workflow.StartAt ?? step.CreatedAt,
                    RetryCount = step.RetryCount,
                    ExecutionDeadline = step.MaxExecutionTime is { } maxExecutionTime
                        ? attemptStartedAt + maxExecutionTime
                        : null,
                    DeferCount = step.DeferCount,
                    FirstDeferredAt = step.FirstDeferredAt,
                    // Projected from the compressed wait: what is left of the budget after the
                    // delays the handler has already asked for. Once that is spent the attempt
                    // starts at or past the deadline, which is what the engine calls a final check.
                    WaitDeadline = step.FirstDeferredAt is null
                        ? null
                        : attemptStartedAt + (waitBudget - step.WaitElapsed),
                    IsFinalWaitCheck = step.FirstDeferredAt is not null && step.WaitElapsed >= waitBudget,
                    Mailbox = step.ProcessingOrder == 0 ? CreateRendezvous(workflow) : null,
                };

                if (await AuthenticateCallback(workflow.Context, appCommandData.CommandKey) is not { } principal)
                {
                    // What the engine does with a 401: a client error, so the step fails without retrying.
                    step.ErrorHistory.Add(
                        new ErrorEntry(
                            DateTimeOffset.UtcNow,
                            $"The app rejected the callback token for command '{appCommandData.CommandKey}'.",
                            (int)HttpStatusCode.Unauthorized,
                            WasRetryable: false
                        )
                    );
                    step.Status = PersistentItemStatus.Failed;
                    step.UpdatedAt = DateTimeOffset.UtcNow;
                    workflow.Status = PersistentItemStatus.Failed;
                    workflow.UpdatedAt = DateTimeOffset.UtcNow;
                    return;
                }
                var run = new FakeStepRun(workflow.OperationId, appCommandData.CommandKey, payload.Mailbox);
                if (_overlapNextRun is { } overlap && overlap(run))
                {
                    _overlapNextRun = null;
                    AppCallbackPayload retried = payload with { RetryCount = payload.RetryCount + 1 };
                    _runTheStepAgain = async () =>
                    {
                        _runTheStepAgain = null;
                        _overlappingAnswer = await Callback(workflow, retried, principal, cancellationToken);
                    };
                }

                IActionResult result = await Callback(workflow, payload, principal, cancellationToken);
                _runTheStepAgain = null;
                if (_overlappingAnswer is { } overlappingAnswer)
                {
                    _overlappingAnswer = null;
                    OverlappedRuns++;
                    result = overlappingAnswer;
                }

                if (result is OkObjectResult { Value: AppCallbackResponse response })
                {
                    if (response.Defer is { } defer)
                    {
                        if (payload.IsFinalWaitCheck)
                        {
                            // What the engine does with a deferral from the final check: the wait has
                            // expired, so the step fails without retrying.
                            step.ErrorHistory.Add(
                                new ErrorEntry(
                                    DateTimeOffset.UtcNow,
                                    $"Wait budget of {waitBudget} exhausted after {step.DeferCount} deferral(s): "
                                        + (defer.Reason ?? "the awaited outcome never became available"),
                                    (int)HttpStatusCode.OK,
                                    WasRetryable: false
                                )
                            );
                            step.Status = PersistentItemStatus.Failed;
                            step.UpdatedAt = DateTimeOffset.UtcNow;
                            workflow.Status = PersistentItemStatus.Failed;
                            workflow.UpdatedAt = DateTimeOffset.UtcNow;
                            return;
                        }

                        // Not a completion: no error recorded, retry counter reset, and the next
                        // attempt starts from the state this one received (the app echoes it back
                        // unchanged, so currentState stays put).
                        step.FirstDeferredAt ??= DateTimeOffset.UtcNow;
                        step.DeferCount++;
                        step.RetryCount = 0;
                        step.WaitElapsed += defer.Delay;
                        step.Status = PersistentItemStatus.Waiting;
                        step.UpdatedAt = DateTimeOffset.UtcNow;
                        workflow.Status = PersistentItemStatus.Waiting;
                        workflow.UpdatedAt = DateTimeOffset.UtcNow;

                        if (step.DeferCount > MaxDeferralsPerStep)
                        {
                            throw new InvalidOperationException(
                                $"Step '{step.OperationId}' deferred {step.DeferCount} times without concluding. "
                                    + "This fake compresses the wait rather than sleeping, so a handler that keeps "
                                    + "deferring loops here instead of parking. Give the step a smaller wait "
                                    + "budget (ProcessStepOptions.WaitBudget), or make the handler conclude."
                            );
                        }

                        continue;
                    }

                    if (_loseNextAnswer is { } loseAnswer && loseAnswer(run))
                    {
                        // What the engine does with an answer that never arrived: an error, and the step runs again
                        // from the state it was given.
                        _loseNextAnswer = null;
                        LostAnswers++;
                        step.ErrorHistory.Add(
                            new ErrorEntry(
                                DateTimeOffset.UtcNow,
                                "The answer was lost.",
                                (int)HttpStatusCode.GatewayTimeout,
                                WasRetryable: true
                            )
                        );
                        step.RetryCount++;
                        continue;
                    }

                    currentState = response.State;
                    MarkStepCompleted(step, response.State);
                    break;
                }

                if (
                    result is ObjectResult { StatusCode: StatusCodes.Status500InternalServerError, Value: string error }
                )
                {
                    // What the engine does with a 500 for an exception the callback did not handle: its default retry
                    // strategy runs the step again from the state it was given.
                    step.ErrorHistory.Add(
                        new ErrorEntry(
                            DateTimeOffset.UtcNow,
                            error,
                            StatusCodes.Status500InternalServerError,
                            WasRetryable: true
                        )
                    );
                    step.RetryCount++;
                    if (step.RetryCount > MaxRetriesOfAThrowingStep)
                    {
                        throw new InvalidOperationException(
                            $"Step '{step.OperationId}' threw on {step.RetryCount} runs: {error}. This fake retries an "
                                + "unhandled exception without waiting, so one that keeps coming loops here."
                        );
                    }

                    continue;
                }

                if (result is ObjectResult { Value: ProblemDetails problem })
                {
                    bool nonRetryable = IsNonRetryable(problem);
                    step.ErrorHistory.Add(
                        new ErrorEntry(
                            DateTimeOffset.UtcNow,
                            problem.Detail ?? problem.Title ?? "Workflow callback failed.",
                            problem.Status,
                            WasRetryable: !nonRetryable
                        )
                    );

                    RetryStrategy? retryStrategy = step.RetryStrategy;
                    bool canRetry = !nonRetryable && retryStrategy is { MaxRetries: > 0 };
                    if (retryStrategy is not null && canRetry && step.RetryCount < retryStrategy.MaxRetries)
                    {
                        step.RetryCount++;
                        step.Status = PersistentItemStatus.Requeued;
                        step.UpdatedAt = DateTimeOffset.UtcNow;
                        workflow.Status = PersistentItemStatus.Requeued;
                        workflow.UpdatedAt = DateTimeOffset.UtcNow;
                        continue;
                    }

                    step.Status = PersistentItemStatus.Failed;
                    step.UpdatedAt = DateTimeOffset.UtcNow;
                    workflow.Status = PersistentItemStatus.Failed;
                    workflow.UpdatedAt = DateTimeOffset.UtcNow;
                    return;
                }

                throw new InvalidOperationException(
                    $"Unexpected result from callback controller: {result.GetType().Name}"
                );
            }
        }

        workflow.State = currentState;
        workflow.Status = PersistentItemStatus.Completed;
        workflow.UpdatedAt = DateTimeOffset.UtcNow;
    }

    private async Task<IActionResult> Callback(
        StoredWorkflow workflow,
        AppCallbackPayload payload,
        ClaimsPrincipal principal,
        CancellationToken cancellationToken
    )
    {
        var controller = new WorkflowEngineCallbackController(
            _serviceProvider,
            _serviceProvider.GetRequiredService<ILogger<WorkflowEngineCallbackController>>(),
            _serviceProvider.GetService<Telemetry>()
        )
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = CreateCallbackRequest(workflow, payload.CommandKey, principal),
            },
        };
        try
        {
            return await WorkflowCallbackHttpContextAccessor.RunCallback(
                controller.HttpContext,
                () =>
                    controller.ExecuteCommand(
                        workflow.Context.Org,
                        workflow.Context.App,
                        workflow.Context.InstanceOwnerPartyId,
                        workflow.Context.InstanceGuid,
                        payload.CommandKey,
                        payload,
                        cancellationToken
                    )
            );
        }
        catch (HttpRequestException exception)
        {
            // A call to the engine that failed inside the callback is an unhandled exception: a bare 500.
            return new ObjectResult(exception.Message) { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    private static void MarkStepCompleted(StoredStep step, string? stateOut)
    {
        step.StateOut = stateOut;
        step.Status = PersistentItemStatus.Completed;
        step.UpdatedAt = DateTimeOffset.UtcNow;
    }

    private static bool IsNonRetryable(ProblemDetails problem) =>
        problem.Extensions.TryGetValue("nonRetryable", out object? value) && value is true;

    private static List<Guid> ResolveWorkflowRefs(
        IEnumerable<WorkflowRef>? workflowRefs,
        Dictionary<string, Guid> refMap
    )
    {
        if (workflowRefs is null)
        {
            return [];
        }

        List<Guid> resolved = [];
        foreach (WorkflowRef workflowRef in workflowRefs)
        {
            if (workflowRef.IsId)
            {
                resolved.Add(workflowRef.Id);
                continue;
            }

            if (!refMap.TryGetValue(workflowRef.Ref, out Guid referencedWorkflowId))
            {
                throw new InvalidOperationException($"Unknown workflow ref '{workflowRef.Ref}'.");
            }

            resolved.Add(referencedWorkflowId);
        }

        return resolved;
    }

    private static bool LabelsMatch(
        IReadOnlyDictionary<string, string>? candidate,
        IReadOnlyDictionary<string, string> filter
    )
    {
        if (candidate is null)
        {
            return false;
        }

        foreach ((string key, string expectedValue) in filter)
        {
            if (
                !candidate.TryGetValue(key, out string? actualValue)
                || !string.Equals(actualValue, expectedValue, StringComparison.Ordinal)
            )
            {
                return false;
            }
        }

        return true;
    }

    private void UpdateCollectionHeads(
        string ns,
        string collectionKey,
        IReadOnlyCollection<Guid> previousHeads,
        IReadOnlyList<StoredWorkflow> createdWorkflows
    )
    {
        // Mirrors the engine's IsHead semantics: IsHead == false (auxiliary) workflows take no part
        // in head tracking - excluded from the heads set, and their dependency edges neither consume
        // existing heads nor remove leaf status from batch workflows they depend on.
        HashSet<Guid> previousHeadSet = [.. previousHeads];
        List<StoredWorkflow> primaryWorkflows = createdWorkflows.Where(workflow => workflow.IsHead != false).ToList();
        HashSet<Guid> consumedHeads =
        [
            .. primaryWorkflows.SelectMany(workflow => workflow.DependencyIds).Where(previousHeadSet.Contains),
        ];
        HashSet<Guid> dependedOnByPrimaryBatch = [.. primaryWorkflows.SelectMany(workflow => workflow.DependencyIds)];
        List<Guid> newHeads = createdWorkflows
            .Where(workflow =>
                workflow.IsHead == true
                || (workflow.IsHead is null && !dependedOnByPrimaryBatch.Contains(workflow.DatabaseId))
            )
            .Select(workflow => workflow.DatabaseId)
            .ToList();

        List<Guid> updatedHeads = previousHeads
            .Where(headId => !consumedHeads.Contains(headId))
            .Concat(newHeads)
            .Distinct()
            .ToList();

        _collectionHeadsByKey[CreateCollectionLookupKey(ns, collectionKey)] = updatedHeads;
    }

    private static string CreateBatchKey(string ns, string idempotencyKey) => $"{ns}|{idempotencyKey}";

    private static string CreateCollectionLookupKey(string ns, string collectionKey) => $"{ns}|{collectionKey}";

    private static WorkflowResult ToWorkflowResult(StoredWorkflow workflow) =>
        new()
        {
            Ref = workflow.Ref,
            DatabaseId = workflow.DatabaseId,
            Namespace = workflow.Namespace,
        };

    private WorkflowStatusResponse ToWorkflowStatusResponse(StoredWorkflow workflow) =>
        new()
        {
            DatabaseId = workflow.DatabaseId,
            OperationId = workflow.OperationId,
            IdempotencyKey = workflow.IdempotencyKey,
            Namespace = workflow.Namespace,
            CollectionKey = workflow.CollectionKey,
            CreatedAt = workflow.CreatedAt,
            UpdatedAt = workflow.UpdatedAt,
            Labels = workflow.Labels is null ? null : new Dictionary<string, string>(workflow.Labels),
            OverallStatus = workflow.Status,
            // Mirrors the engine's derivation of the role from the stored IsHead directive.
            Role = workflow.IsHead == false ? WorkflowRole.Auxiliary : WorkflowRole.Primary,
            Dependencies =
                workflow.DependencyIds.Count == 0
                    ? null
                    : workflow.DependencyIds.ToDictionary(
                        dependencyId => dependencyId,
                        dependencyId =>
                            _workflows.TryGetValue(dependencyId, out StoredWorkflow? dependency)
                                ? dependency.Status
                                : PersistentItemStatus.DependencyFailed
                    ),
            Links =
                workflow.LinkIds.Count == 0
                    ? null
                    : workflow
                        .LinkIds.Where(linkId => _workflows.ContainsKey(linkId))
                        .ToDictionary(linkId => linkId, linkId => _workflows[linkId].Status),
            InitialState = workflow.InitialState,
            Steps = workflow.Steps.Select(ToStepStatusResponse).ToList(),
        };

    private static StepStatusResponse ToStepStatusResponse(StoredStep step) =>
        new()
        {
            DatabaseId = step.DatabaseId,
            OperationId = step.OperationId,
            ProcessingOrder = step.ProcessingOrder,
            UpdatedAt = step.UpdatedAt,
            Labels = step.Labels is null ? null : new Dictionary<string, string>(step.Labels),
            Command = new StepStatusResponse.CommandDetails { Type = step.CommandType },
            Status = step.Status,
            RetryCount = step.RetryCount,
            StateOut = step.StateOut,
            RetryStrategy = step.RetryStrategy,
            ErrorHistory = step.ErrorHistory.Count == 0 ? null : step.ErrorHistory.ToList(),
        };

    private static void ResetWorkflowForResume(StoredWorkflow workflow)
    {
        workflow.Status = PersistentItemStatus.Enqueued;
        workflow.UpdatedAt = DateTimeOffset.UtcNow;

        foreach (StoredStep step in workflow.Steps)
        {
            if (step.Status == PersistentItemStatus.Completed)
            {
                continue;
            }

            step.Status = PersistentItemStatus.Enqueued;
            step.UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    /// <summary>
    /// Authenticates a callback with the app's own validator, as the callback scheme does for a real request,
    /// so the controller sees the principal the engine's replayed token would give it. <c>null</c> when the app
    /// would answer 401.
    /// </summary>
    private async Task<ClaimsPrincipal?> AuthenticateCallback(AppWorkflowContext context, string commandKey)
    {
        ValidatedWorkflowCallbackToken? validated = await _serviceProvider
            .GetRequiredService<IWorkflowCallbackTokenValidator>()
            .ValidateToken(context.CallbackToken, context.InstanceGuid, commandKey);
        if (validated is null)
            return null;
        return new ClaimsPrincipal(
            new ClaimsIdentity(
                [
                    new Claim(JwtClaimTypes.JwtId, context.InstanceGuid.ToString()),
                    new Claim(JwtClaimTypes.WorkflowCallback.ActorHash, validated.ActorHash),
                ],
                WorkflowEngineCallbackDefaults.AuthenticationScheme
            )
        );
    }

    /// <summary>
    /// The request a callback is: one of its own, as the engine sends it. It has no query string, is routed to the
    /// callback endpoint and carries the callback token, so the app authenticates it as itself.
    /// </summary>
    private static DefaultHttpContext CreateCallbackRequest(
        StoredWorkflow workflow,
        string commandKey,
        ClaimsPrincipal principal
    )
    {
        AppWorkflowContext context = workflow.Context;
        var httpContext = new DefaultHttpContext { User = principal };
        httpContext.Request.Method = HttpMethods.Post;
        httpContext.Request.Path =
            $"/{context.Org}/{context.App}/instances/{context.InstanceOwnerPartyId}/{context.InstanceGuid}/workflow-engine-callbacks/{commandKey}";
        httpContext.Request.RouteValues = new RouteValueDictionary
        {
            ["org"] = context.Org,
            ["app"] = context.App,
            ["instanceOwnerPartyId"] = context.InstanceOwnerPartyId,
            ["instanceGuid"] = context.InstanceGuid,
            ["commandKey"] = commandKey,
        };
        httpContext.Request.Headers.Authorization = $"Bearer {context.CallbackToken}";
        if (!string.IsNullOrWhiteSpace(workflow.CollectionKey))
        {
            httpContext.Request.Headers["Collection-Key"] = workflow.CollectionKey;
        }
        return httpContext;
    }

    private static bool IsAltinnEventCommand(string commandKey) =>
        commandKey.EndsWith("AltinnEvent", StringComparison.OrdinalIgnoreCase);

    private sealed class StoredWorkflow
    {
        public required Guid DatabaseId { get; init; }

        public string? Ref { get; init; }

        public bool? IsHead { get; init; }

        public DateTimeOffset? StartAt { get; init; }

        public required string Namespace { get; init; }

        public required string? CollectionKey { get; init; }

        public required string IdempotencyKey { get; init; }

        public required string OperationId { get; init; }

        public required AppWorkflowContext Context { get; init; }

        public required IReadOnlyDictionary<string, string>? Labels { get; init; }

        public required List<Guid> DependencyIds { get; init; }

        public required List<Guid> LinkIds { get; init; }

        public required List<StoredStep> Steps { get; init; }

        public required DateTimeOffset CreatedAt { get; init; }

        public required DateTimeOffset UpdatedAt { get; set; }

        public string? InitialState { get; init; }

        public string? State { get; set; }

        public PersistentItemStatus Status { get; set; } = PersistentItemStatus.Enqueued;

        /// <summary>The mailbox a receive workflow receives from.</summary>
        public Guid? MailboxId { get; init; }

        /// <summary>The receive workflow's position in its mailbox's receivers log.</summary>
        public long? MailboxSeq { get; init; }
    }

    private sealed record StoredDelivery(MailboxDeliveryResponse Response, string Payload);

    /// <summary>A step run whose callback answered: its workflow, its command, and the message it was given, if any.</summary>
    internal sealed record FakeStepRun(string WorkflowOperationId, string CommandKey, AppCallbackMailbox? Mailbox);

    private sealed class StoredStep
    {
        public required Guid DatabaseId { get; init; }

        public required string OperationId { get; init; }

        public required int ProcessingOrder { get; init; }

        public required IReadOnlyDictionary<string, string>? Labels { get; init; }

        public required string CommandType { get; init; }

        public required JsonElement? CommandData { get; init; }

        public required RetryStrategy? RetryStrategy { get; init; }

        public required TimeSpan? WaitBudget { get; init; }

        public required TimeSpan? MaxExecutionTime { get; init; }

        public required DateTimeOffset CreatedAt { get; init; }

        public DateTimeOffset? UpdatedAt { get; set; }

        public int RetryCount { get; set; }

        public int DeferCount { get; set; }

        public DateTimeOffset? FirstDeferredAt { get; set; }

        /// <summary>
        /// How much of the wait budget the step's deferrals have asked for. The fake compresses the
        /// wait instead of sleeping, so this stands in for elapsed time.
        /// </summary>
        public TimeSpan WaitElapsed { get; set; }

        public string? StateOut { get; set; }

        public PersistentItemStatus Status { get; set; } = PersistentItemStatus.Enqueued;

        public List<ErrorEntry> ErrorHistory { get; } = [];
    }
}
