using System.Text;
using LibGit2Sharp;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Service interface for git repository operations
/// </summary>
internal interface IGitRepositoryService
{
    string FindRepositoryRoot(string startPath);
    IEnumerable<string> GetModifiedFiles(string repoRoot, string pathFilter);
    string GetUnifiedDiff(string repoRoot, string filePath);
    string GetFileContentFromHead(string repoRoot, string filePath);
}

/// <summary>
/// LibGit2Sharp implementation of git repository operations
/// </summary>
internal sealed class LibGit2SharpGitRepositoryService : IGitRepositoryService
{
    /// <summary>
    /// Find the git repository root by using LibGit2Sharp's discovery mechanism
    /// </summary>
    public string FindRepositoryRoot(string startPath)
    {
        var repoPath = Repository.Discover(startPath);

        if (string.IsNullOrEmpty(repoPath))
        {
            throw new InvalidOperationException($"Could not find git repository starting from {startPath}");
        }

        // Repository.Discover returns the .git directory path
        // We need the working directory (parent of .git)
        var gitDir = new DirectoryInfo(repoPath);

        // Handle both regular repositories (.git folder) and bare repositories
        if (gitDir.Name == ".git")
        {
            return gitDir.Parent?.FullName
                ?? throw new InvalidOperationException("Could not determine repository root");
        }

        // For bare repositories or git files (submodules/worktrees), use LibGit2Sharp to get the working directory
        using var repo = new Repository(repoPath);
        var workingDir = repo.Info.WorkingDirectory;

        if (string.IsNullOrEmpty(workingDir))
        {
            throw new InvalidOperationException($"Repository at {repoPath} has no working directory (might be bare)");
        }

        // Remove trailing path separator
        return workingDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
    }

    /// <summary>
    /// Get list of modified JSON files matching the path filter
    /// </summary>
    public IEnumerable<string> GetModifiedFiles(string repoRoot, string pathFilter)
    {
        using var repo = new Repository(repoRoot);

        var statusOptions = new StatusOptions { IncludeUnaltered = false, Show = StatusShowOption.WorkDirOnly };

        var status = repo.RetrieveStatus(statusOptions);

        // Get modified files that match the filter pattern
        var modifiedFiles = status
            .Where(entry => entry.State == FileStatus.ModifiedInWorkdir)
            .Select(entry => entry.FilePath)
            .Where(path => path.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            .Where(path => IsPathMatchingFilter(path, pathFilter))
            .ToList();

        return modifiedFiles;
    }

    /// <summary>
    /// Generate unified diff for a specific file
    /// </summary>
    public string GetUnifiedDiff(string repoRoot, string filePath)
    {
        using var repo = new Repository(repoRoot);

        // Get the file from HEAD
        var headCommit = repo.Head.Tip;
        if (headCommit == null)
        {
            throw new InvalidOperationException("Repository has no HEAD commit");
        }

        // Compare HEAD version with working directory version
        var compareOptions = new CompareOptions { ContextLines = 3, InterhunkLines = 0 };

        // Get changes for specific file paths
        var paths = new[] { filePath };
        var patch = repo.Diff.Compare<Patch>(
            headCommit.Tree,
            DiffTargets.WorkingDirectory,
            paths,
            null,
            compareOptions
        );

        if (patch == null)
        {
            return string.Empty;
        }

        // Get the patch content for the file
        var patchEntry = patch.FirstOrDefault();
        return patchEntry?.Patch ?? string.Empty;
    }

    /// <summary>
    /// Read file content from HEAD commit
    /// </summary>
    public string GetFileContentFromHead(string repoRoot, string filePath)
    {
        using var repo = new Repository(repoRoot);

        var headCommit = repo.Head.Tip;
        if (headCommit == null)
        {
            throw new InvalidOperationException("Repository has no HEAD commit");
        }

        // Get the tree entry for the file
        var treeEntry = headCommit[filePath];
        if (treeEntry == null)
        {
            throw new InvalidOperationException($"File {filePath} not found in HEAD commit");
        }

        // Get the blob (file content)
        var blob = treeEntry.Target as Blob;
        if (blob == null)
        {
            throw new InvalidOperationException($"File {filePath} is not a blob in HEAD commit");
        }

        // Read content as text
        using var contentStream = blob.GetContentStream();
        using var reader = new StreamReader(contentStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        return reader.ReadToEnd();
    }

    /// <summary>
    /// Check if a file path matches the filter pattern
    /// </summary>
    private bool IsPathMatchingFilter(string filePath, string pathFilter)
    {
        if (string.IsNullOrEmpty(pathFilter))
        {
            return true;
        }

        // Normalize paths for comparison
        var normalizedPath = filePath.Replace('\\', '/');
        var normalizedFilter = pathFilter.Replace('\\', '/');

        // Simple prefix matching - can be enhanced with glob patterns if needed
        return normalizedPath.StartsWith(normalizedFilter, StringComparison.OrdinalIgnoreCase)
            || normalizedPath.Contains("/" + normalizedFilter, StringComparison.OrdinalIgnoreCase);
    }
}
