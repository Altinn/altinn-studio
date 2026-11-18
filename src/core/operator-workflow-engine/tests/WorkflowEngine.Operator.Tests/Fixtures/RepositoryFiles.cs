using System.Runtime.CompilerServices;

namespace WorkflowEngine.Operator.Tests.Fixtures;

/// <summary>
/// Finds files elsewhere in the repository, such as the callback contract examples the operator's tests also read.
/// </summary>
internal static class RepositoryFiles
{
    public static string CallbackContractDirectory =>
        Path.Combine(Root(), "src", "core", "operator", "testdata", "callbacks");

    /// <summary>
    /// Walks up from this source file to the folder with <c>.git</c>, a directory in a clone and a file in a worktree.
    /// </summary>
    /// <remarks>
    /// The compiled-in source path works from any folder, but only on the machine that built the tests.
    /// </remarks>
    private static string Root([CallerFilePath] string sourceFile = "")
    {
        for (
            var directory = Path.GetDirectoryName(sourceFile);
            directory is not null;
            directory = Path.GetDirectoryName(directory)
        )
        {
            var git = Path.Combine(directory, ".git");
            if (Directory.Exists(git) || File.Exists(git))
                return directory;
        }

        throw new InvalidOperationException($"No repository root above '{sourceFile}'.");
    }
}
