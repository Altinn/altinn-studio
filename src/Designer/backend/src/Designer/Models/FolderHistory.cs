using System;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Summary of the commits that changed a folder in a repository.
/// </summary>
/// <param name="FirstCommitAuthorName">The author name of the first commit that changed the folder.</param>
/// <param name="LastCommitTime">The committer time of the last commit that changed the folder.</param>
public record FolderHistory(string FirstCommitAuthorName, DateTimeOffset LastCommitTime);
