using System.Text.Json;
using System.Text.Json.Nodes;
using LibGit2Sharp;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.LayoutSetsMigration;

internal sealed class LayoutSetsToTaskUiMigrator : IDisposable
{
    private readonly string _projectFolder;
    private readonly GitOperations? _git;

    public LayoutSetsToTaskUiMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
        _git = GitOperations.TryCreate(projectFolder);
    }

    public void Dispose()
    {
        _git?.Dispose();
    }

    public MigrationResult Migrate()
    {
        var uiPath = Path.Combine(_projectFolder, "App", "ui");
        if (!Directory.Exists(uiPath))
        {
            uiPath = Path.Combine(_projectFolder, "ui");
            if (!Directory.Exists(uiPath))
            {
                return new MigrationResult();
            }
        }

        var layoutSetsPath = Path.Combine(uiPath, "layout-sets.json");
        if (!File.Exists(layoutSetsPath))
        {
            return new MigrationResult();
        }

        var parsed = JsonNode.Parse(File.ReadAllText(layoutSetsPath)) as JsonObject;
        if (parsed is null)
        {
            throw new InvalidOperationException("layout-sets.json is not a valid JSON object.");
        }

        var sets = parsed["sets"] as JsonArray;
        if (sets is null)
        {
            throw new InvalidOperationException("layout-sets.json is missing a 'sets' array.");
        }

        var plans = BuildPlans(uiPath, sets);
        ValidateCollisions(uiPath, plans);

        var touchedFolders = new HashSet<string>(StringComparer.Ordinal);
        var copiedFolderCount = 0;
        var renamedFolderCount = 0;
        var deletedSourceFolderCount = 0;

        foreach (var plan in plans)
        {
            foreach (var destinationId in plan.DestinationIds)
            {
                var destinationPath = Path.Combine(uiPath, destinationId);
                if (!plan.SourcePath.Equals(destinationPath, StringComparison.Ordinal))
                {
                    if (plan.DestinationIds.Count == 1)
                    {
                        MoveDirectory(plan.SourcePath, destinationPath);
                        renamedFolderCount++;
                    }
                    else
                    {
                        CopyDirectory(plan.SourcePath, destinationPath);
                        _git?.StageDirectory(destinationPath);
                        copiedFolderCount++;
                    }
                }

                touchedFolders.Add(destinationId);
                UpsertDefaultDataType(destinationPath, plan.DataType);
            }

            if (plan.DestinationIds.Count > 1 && !plan.DestinationIds.Contains(plan.SourceId, StringComparer.Ordinal))
            {
                DeleteDirectory(plan.SourcePath);
                deletedSourceFolderCount++;
            }
        }

        var migratedGlobalSettings = false;
        if (parsed["uiSettings"] is JsonObject { Count: > 0 } uiSettingsObject)
        {
            var globalSettingsPath = Path.Combine(uiPath, "Settings.json");
            var options = new JsonSerializerOptions { WriteIndented = true };
            File.WriteAllText(globalSettingsPath, uiSettingsObject.ToJsonString(options));
            _git?.StageFile(globalSettingsPath);
            migratedGlobalSettings = true;
        }

        File.Delete(layoutSetsPath);
        _git?.StageRemoval(layoutSetsPath);

        return new MigrationResult
        {
            LayoutSetsDeleted = true,
            MigratedFolderCount = touchedFolders.Count,
            CopiedFolderCount = copiedFolderCount,
            RenamedFolderCount = renamedFolderCount,
            DeletedSourceFolderCount = deletedSourceFolderCount,
            MigratedGlobalSettings = migratedGlobalSettings,
        };
    }

    private void MoveDirectory(string sourcePath, string destinationPath)
    {
        if (_git is not null)
        {
            _git.MoveDirectory(sourcePath, destinationPath);
        }
        else
        {
            Directory.Move(sourcePath, destinationPath);
        }
    }

    private void DeleteDirectory(string path)
    {
        if (_git is not null)
        {
            _git.DeleteDirectory(path);
        }
        else
        {
            Directory.Delete(path, recursive: true);
        }
    }

    private static List<LayoutSetMigrationPlan> BuildPlans(string uiPath, JsonArray sets)
    {
        var plans = new List<LayoutSetMigrationPlan>();
        foreach (var setNode in sets)
        {
            if (setNode is not JsonObject setObject)
            {
                continue;
            }

            var sourceId = setObject["id"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(sourceId))
            {
                continue;
            }

            var sourcePath = Path.Combine(uiPath, sourceId);
            if (!Directory.Exists(sourcePath))
            {
                throw new InvalidOperationException($"Missing UI folder for layout set '{sourceId}' ({sourcePath}).");
            }

            plans.Add(
                new LayoutSetMigrationPlan(
                    sourceId,
                    sourcePath,
                    ResolveDestinationFolderIds(sourceId, setObject["tasks"] as JsonArray),
                    setObject["dataType"]?.GetValue<string>()
                )
            );
        }

        return plans;
    }

    private static void ValidateCollisions(string uiPath, List<LayoutSetMigrationPlan> plans)
    {
        var claimedDestinations = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var plan in plans)
        {
            foreach (var destinationId in plan.DestinationIds)
            {
                var destinationPath = Path.Combine(uiPath, destinationId);
                if (
                    !plan.SourcePath.Equals(destinationPath, StringComparison.Ordinal)
                    && Directory.Exists(destinationPath)
                )
                {
                    throw new InvalidOperationException(
                        $"Cannot migrate layout set '{plan.SourceId}' to '{destinationId}'. Destination folder already exists."
                    );
                }

                if (claimedDestinations.TryGetValue(destinationId, out var previousSourceId))
                {
                    if (!string.Equals(previousSourceId, plan.SourceId, StringComparison.Ordinal))
                    {
                        throw new InvalidOperationException(
                            $"Cannot migrate layout sets '{previousSourceId}' and '{plan.SourceId}' to '{destinationId}'. "
                                + "Multiple layout sets target the same destination folder."
                        );
                    }
                }
                else
                {
                    claimedDestinations[destinationId] = plan.SourceId;
                }
            }
        }
    }

    private static List<string> ResolveDestinationFolderIds(string sourceId, JsonArray? tasks)
    {
        var taskIds =
            tasks
                ?.Select(n => n?.GetValue<string>())
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Cast<string>()
                .Distinct(StringComparer.Ordinal)
                .ToList() ?? [];

        if (taskIds.Count == 0)
        {
            return [sourceId];
        }

        return taskIds;
    }

    private void UpsertDefaultDataType(string folderPath, string? dataType)
    {
        if (string.IsNullOrWhiteSpace(dataType))
        {
            return;
        }

        var settingsPath = Path.Combine(folderPath, "Settings.json");
        JsonObject settings;
        if (File.Exists(settingsPath))
        {
            settings =
                JsonNode.Parse(File.ReadAllText(settingsPath)) as JsonObject
                ?? throw new InvalidOperationException($"Invalid JSON in {settingsPath}");
        }
        else
        {
            settings = [];
        }

        settings["defaultDataType"] = dataType;
        var options = new JsonSerializerOptions { WriteIndented = true };
        File.WriteAllText(settingsPath, settings.ToJsonString(options));
        _git?.StageFile(settingsPath);
    }

    private static void CopyDirectory(string sourceDir, string destinationDir)
    {
        Directory.CreateDirectory(destinationDir);
        foreach (var file in Directory.GetFiles(sourceDir))
        {
            var destinationFile = Path.Combine(destinationDir, Path.GetFileName(file));
            File.Copy(file, destinationFile, overwrite: false);
        }

        foreach (var subDirectory in Directory.GetDirectories(sourceDir))
        {
            var destinationSubDirectory = Path.Combine(destinationDir, Path.GetFileName(subDirectory));
            CopyDirectory(subDirectory, destinationSubDirectory);
        }
    }
}

internal sealed class MigrationResult
{
    public bool LayoutSetsDeleted { get; init; }
    public int MigratedFolderCount { get; init; }
    public int CopiedFolderCount { get; init; }
    public int RenamedFolderCount { get; init; }
    public int DeletedSourceFolderCount { get; init; }
    public bool MigratedGlobalSettings { get; init; }
}

internal sealed record LayoutSetMigrationPlan(
    string SourceId,
    string SourcePath,
    List<string> DestinationIds,
    string? DataType
);

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
        // Collect all files before moving
        var sourceFiles = Directory
            .GetFiles(sourcePath, "*", SearchOption.AllDirectories)
            .Select(f => GetRelativePath(f))
            .ToList();

        // Move at filesystem level
        Directory.Move(sourcePath, destinationPath);

        // Stage removals for old paths
        foreach (var relativePath in sourceFiles)
        {
            Commands.Remove(_repo, relativePath, removeFromWorkingDirectory: false);
        }

        // Stage additions for new paths
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
    /// Stages a single file (new or modified).
    /// </summary>
    public void StageFile(string path)
    {
        Commands.Stage(_repo, GetRelativePath(path));
    }

    /// <summary>
    /// Stages a file removal (file must already be deleted from filesystem).
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
