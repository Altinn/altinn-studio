using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.TypedHttpClients.Operator.Models;

/// <summary>
/// A run as the operator reports it.
/// </summary>
/// <param name="Id">The run.</param>
/// <param name="Kind">The kind the run was created with.</param>
/// <param name="Labels">What the run is for, with the values in lowercase.</param>
/// <param name="Status">Where the run is.</param>
/// <param name="QueuePosition">The position in the queue of the kind, 1 being next. Set only while the run is queued.</param>
/// <param name="CreatedAt">When the operator created the run.</param>
/// <param name="StartedAt">
/// When the command started. Set from <see cref="RunStatus.Running"/> on, unless the run ended before its command
/// started.
/// </param>
/// <param name="FinishedAt">When the run reached a final status.</param>
/// <param name="ResultExpiresAt">
/// Until when <see cref="IOperatorClient.GetRunResult"/> can fetch the result. Set only when the run completed.
/// </param>
/// <param name="Error">Why the run failed. Set only when it failed.</param>
internal sealed record Run(
    Guid Id,
    string Kind,
    IReadOnlyDictionary<string, string> Labels,
    RunStatus Status,
    int? QueuePosition,
    DateTimeOffset CreatedAt,
    DateTimeOffset? StartedAt,
    DateTimeOffset? FinishedAt,
    DateTimeOffset? ResultExpiresAt,
    RunError? Error
);
