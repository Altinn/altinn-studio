using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// The outcome of combining the local commits with the same branch on origin.
/// </summary>
public sealed class CombineResult
{
    /// <summary>
    /// Whether the merge met conflicts. They stay in the working directory for the conflict screen.
    /// </summary>
    public bool HasConflicts { get; set; }

    /// <summary>
    /// The files that combining changed in the working directory.
    /// </summary>
    public List<RepositoryContent> ContentStatus { get; set; } = [];
}
