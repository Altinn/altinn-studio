using LibGit2Sharp;

namespace Altinn.Studio.Cli.Upgrade;

/// <summary>
/// Helper class for git operations using LibGit2Sharp.
/// Stages file changes so that moves are detected as renames by git.
/// </summary>
internal sealed class GitOperations : IDisposable
{
    private readonly Repository _repo;
    private readonly string _repoRoot;

    private GitOperations(Repository repo, string repoRoot)
    {
        _repo = repo;
        _repoRoot = repoRoot;
    }

    /// <summary>
    /// Tries to create a GitOperations instance for the given path.
    /// Returns null if the path is not inside a git repository.
    /// </summary>
    public static GitOperations? TryCreate(string path)
    {
        var repoPath = Repository.Discover(path);
        if (string.IsNullOrEmpty(repoPath))
        {
            return null;
        }

        var repo = new Repository(repoPath);
        var workingDir = repo.Info.WorkingDirectory;
        if (string.IsNullOrEmpty(workingDir))
        {
            repo.Dispose();
            return null;
        }

        var repoRoot = workingDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        return new GitOperations(repo, repoRoot);
    }

    /// <summary>
    /// Moves a directory and stages the changes as a rename in git.
    /// </summary>
    public void MoveDirectory(string sourcePath, string destinationPath)
    {
        var sourceFiles = Directory
            .GetFiles(sourcePath, "*", SearchOption.AllDirectories)
            .Select(f => GetRelativePath(f))
            .ToList();

        Directory.Move(sourcePath, destinationPath);

        foreach (var relativePath in sourceFiles)
        {
            Commands.Remove(_repo, relativePath, removeFromWorkingDirectory: false);
        }

        var newFiles = Directory
            .GetFiles(destinationPath, "*", SearchOption.AllDirectories)
            .Select(f => GetRelativePath(f));
        Commands.Stage(_repo, newFiles);
    }

    /// <summary>
    /// Deletes a directory and stages the removal in git.
    /// </summary>
    public void DeleteDirectory(string path)
    {
        var files = Directory.GetFiles(path, "*", SearchOption.AllDirectories).Select(f => GetRelativePath(f)).ToList();

        Directory.Delete(path, recursive: true);

        foreach (var relativePath in files)
        {
            Commands.Remove(_repo, relativePath, removeFromWorkingDirectory: false);
        }
    }

    /// <summary>
    /// Stages all files in a directory as additions.
    /// </summary>
    public void StageDirectory(string path)
    {
        var files = Directory.GetFiles(path, "*", SearchOption.AllDirectories).Select(f => GetRelativePath(f));
        Commands.Stage(_repo, files);
    }

    /// <summary>
    /// Stages a single file.
    /// </summary>
    public void StageFile(string path)
    {
        Commands.Stage(_repo, GetRelativePath(path));
    }

    /// <summary>
    /// Stages a file removal.
    /// </summary>
    public void StageRemoval(string path)
    {
        Commands.Remove(_repo, GetRelativePath(path), removeFromWorkingDirectory: false);
    }

    private string GetRelativePath(string absolutePath)
    {
        return Path.GetRelativePath(_repoRoot, absolutePath).Replace('\\', '/');
    }

    public void Dispose()
    {
        _repo.Dispose();
    }
}
