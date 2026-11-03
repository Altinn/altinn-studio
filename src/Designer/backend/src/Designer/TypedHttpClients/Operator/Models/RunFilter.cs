using System.Collections.Generic;

namespace Altinn.Studio.Designer.TypedHttpClients.Operator.Models;

/// <summary>
/// Which runs <see cref="IOperatorClient.FindRuns"/> finds: those that have every label and the kind, when they are
/// set. Set at least one of them. After a restart, Designer finds its run for a commit by the
/// <c>repoOwner</c>, <c>repo</c> and <c>commit</c> labels of its <see cref="RunSource"/>.
/// </summary>
internal sealed record RunFilter
{
    /// <summary>The labels of the runs. Values are compared without case.</summary>
    public IReadOnlyDictionary<string, string>? Labels { get; init; }

    /// <summary>The kind of the runs, such as <c>upgrade-v9</c>.</summary>
    public string? Kind { get; init; }
}
