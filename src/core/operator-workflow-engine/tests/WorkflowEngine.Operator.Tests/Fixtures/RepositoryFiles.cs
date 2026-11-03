using System.Runtime.CompilerServices;

namespace WorkflowEngine.Operator.Tests.Fixtures;

/// <summary>
/// Finds files elsewhere in the repository, such as the callback contract examples the operator's tests also read.
/// </summary>
internal static class RepositoryFiles
{
    /// <summary>
    /// The folder with the callback contract examples, <c>src/core/operator/api/callbacks</c>.
    /// </summary>
    public static string CallbackContractDirectory =>
        Path.Combine(Root(), "src", "core", "operator", "api", "callbacks");

    /// <summary>
    /// Walks up from this source file to the folder that holds <c>.git</c>, a directory in a clone and a file in a
    /// worktree.
    /// </summary>
    /// <remarks>
    /// The source file's path is compiled in, so this works wherever the tests run from, but only on the machine that
    /// built them, which is how they always run.
    /// </remarks>
    private static string Root([CallerFilePath] string sourceFile = "")
    {
        for (var dir = Path.GetDirectoryName(sourceFile); dir is not null; dir = Path.GetDirectoryName(dir))
        {
            var git = Path.Combine(dir, ".git");
            if (Directory.Exists(git) || File.Exists(git))
                return dir;
        }

        throw new InvalidOperationException($"No repository root above '{sourceFile}'.");
    }
}
