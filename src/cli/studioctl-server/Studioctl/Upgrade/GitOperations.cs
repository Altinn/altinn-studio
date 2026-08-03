using LibGit2Sharp;

namespace Altinn.Studio.Cli.Upgrade;

/// <summary>
/// Git helpers on top of LibGit2Sharp.
/// </summary>
internal static class GitOperations
{
    /// <summary>
    /// Stages every change in the repository containing <paramref name="path"/> — the equivalent of
    /// <c>git add -A</c>. Failures are reported to <paramref name="output"/> and never fail the caller.
    /// </summary>
    public static void StageAllChanges(string path, TextWriter output)
    {
        try
        {
            var repoPath = Repository.Discover(path);
            if (string.IsNullOrEmpty(repoPath))
            {
                output.WriteLine("Not a git repository - leaving changes unstaged");
                return;
            }

            using var repo = new Repository(repoPath);
            Commands.Stage(repo, "*");

            var stagedCount = repo.Diff.Compare<TreeChanges>(repo.Head.Tip?.Tree, DiffTargets.Index).Count();
            output.WriteLine(
                $"Staged the {stagedCount} updated file(s) - run 'git status' for overview and 'git diff --cached' to review them"
            );
        }
        catch (LibGit2SharpException ex)
        {
            output.WriteLine($"Warning: Failed to stage changes: {ex.Message}");
        }
    }
}
