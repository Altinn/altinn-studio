using System.Text;
using LibGit2Sharp;

namespace Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

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
    /// Generate unified diff for a specific file (index vs working directory).
    /// Using the index as the base (rather than HEAD) means this works correctly
    /// for both in-place modifications and files that have been renamed/moved in
    /// the index — the index always has the file at the current path.
    /// </summary>
    public string GetUnifiedDiff(string repoRoot, string filePath)
    {
        using var repo = new Repository(repoRoot);

        var compareOptions = new CompareOptions { ContextLines = 0, InterhunkLines = 0 };

        // Compare index with working directory for specific file paths
        var paths = new[] { filePath };
        var patch = repo.Diff.Compare<Patch>(
            paths,
            includeUntracked: false,
            explicitPathsOptions: null,
            compareOptions: compareOptions
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
    /// Read file content from the index (staging area).
    /// Using the index (rather than HEAD) means this works correctly for files
    /// that have been renamed/moved — the index has the file at its current path
    /// with the original content, while HEAD only has it at the old path.
    /// For unmodified files the index matches HEAD, so behavior is identical.
    /// </summary>
    public string GetFileContentFromHead(string repoRoot, string filePath)
    {
        using var repo = new Repository(repoRoot);

        var indexEntry = repo.Index[filePath];
        if (indexEntry == null)
        {
            throw new InvalidOperationException($"File {filePath} not found in index");
        }

        var blob = repo.Lookup<Blob>(indexEntry.Id);
        if (blob == null)
        {
            throw new InvalidOperationException($"Could not read content for {filePath} from index");
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
