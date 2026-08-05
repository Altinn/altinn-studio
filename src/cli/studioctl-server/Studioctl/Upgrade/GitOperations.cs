using LibGit2Sharp;

namespace Altinn.Studio.Cli.Upgrade;

/// <summary>
/// Git helpers on top of LibGit2Sharp.
/// </summary>
internal static class GitOperations
{
    /// <summary>
    /// Whether the working tree of the repository containing <paramref name="path"/> is confirmed clean — no
    /// staged, unstaged or untracked changes. A path deliberately outside git counts as clean. Anything we
    /// cannot confirm is not clean: local changes leave <paramref name="error"/> <c>null</c>, while a
    /// repository we cannot read reports the git failure in <paramref name="error"/>.
    /// </summary>
    public static bool IsWorkingTreeClean(string path, out string? error)
    {
        error = null;

        try
        {
            using var repo = TryOpenRepository(path);
            if (repo is null)
            {
                return true;
            }

            return !repo.RetrieveStatus().IsDirty;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            error = ex.Message;
            return false;
        }
    }

    /// <summary>
    /// Stages every change in the repository containing <paramref name="path"/> — the equivalent of
    /// <c>git add -A</c>. Failures are reported to <paramref name="output"/> and never fail the caller.
    /// </summary>
    public static void StageAllChanges(string path, TextWriter output)
    {
        try
        {
            using var repo = TryOpenRepository(path);
            if (repo is null)
            {
                output.WriteLine("Not a git repository - leaving changes unstaged");
                return;
            }

            Commands.Stage(repo, "*");

            using var stagedChanges = repo.Diff.Compare<TreeChanges>(repo.Head.Tip?.Tree, DiffTargets.Index);
            output.WriteLine(
                $"Staged the {stagedChanges.Count} updated file(s) - run 'git status' for overview and 'git diff --cached' to review them"
            );
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            output.WriteLine($"Warning: Failed to stage changes: {ex.Message}");
        }
    }

    /// <summary>
    /// Opens the repository containing <paramref name="path"/>, or <c>null</c> when <paramref name="path"/> is
    /// not inside a git repository.
    /// </summary>
    private static Repository? TryOpenRepository(string path)
    {
        var repoPath = Repository.Discover(path);
        return string.IsNullOrEmpty(repoPath) ? null : new Repository(repoPath);
    }
}
