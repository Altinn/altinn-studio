namespace Altinn.Studio.Designer.TypedHttpClients.Operator.Models;

/// <summary>
/// Which runs <see cref="IOperatorClient.FindRuns"/> finds: those that match every value that is set. Set at least
/// one. After a restart, Designer finds its run for a commit with <see cref="RepoOwner"/>, <see cref="Repo"/> and
/// <see cref="Commit"/>.
/// </summary>
internal sealed record RunFilter
{
    /// <summary>The <see cref="RunSource.Org"/> of the runs, compared without case.</summary>
    public string? Org { get; init; }

    /// <summary>The <see cref="RunSource.App"/> of the runs, compared without case.</summary>
    public string? App { get; init; }

    /// <summary>The <see cref="RunSource.RepoOwner"/> of the runs, compared without case.</summary>
    public string? RepoOwner { get; init; }

    /// <summary>The <see cref="RunSource.Repo"/> of the runs, compared without case.</summary>
    public string? Repo { get; init; }

    /// <summary>The <see cref="RunSource.Commit"/> of the runs.</summary>
    public string? Commit { get; init; }

    /// <summary>The kind of the runs, such as <c>upgrade-v9</c>.</summary>
    public string? Kind { get; init; }
}
