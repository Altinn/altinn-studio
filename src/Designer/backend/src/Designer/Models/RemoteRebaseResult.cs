using System.Collections.Generic;
using LibGit2Sharp;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// The outcome of rebasing local commits onto the same branch on origin.
/// </summary>
public sealed class RemoteRebaseResult
{
    /// <summary>
    /// The status of the rebase. On conflicts the rebase has been aborted and the remote branch merged without a
    /// commit, so the conflicts are in the working directory.
    /// </summary>
    public RebaseStatus Status { get; set; }

    /// <summary>
    /// The files that the rebase changed in the working directory.
    /// </summary>
    public List<RepositoryContent> ContentStatus { get; set; } = [];
}
