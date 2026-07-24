using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.LayoutSetsMigration;

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

        // Clean up empty folders from previous botched runs before proceeding
        DeleteEmptyDirectoriesRecursively(uiPath);

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

        var subformReferencedSets = CollectSubformLayoutSetReferences(uiPath);
        var plans = BuildPlans(uiPath, sets, subformReferencedSets);
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

        // Restore whitespace-only changes to preserve original formatting in Settings.json files.
        // UpsertDefaultDataType intentionally leaves files unstaged so the processor can diff
        // the working directory against the index (which has the original formatting).
        try
        {
            var whitespaceRestorer = new WhitespaceRestorationProcessor(uiPath);
            whitespaceRestorer.RestoreWhitespaceOnlyChanges();
        }
        catch
        {
            // Non-fatal: whitespace restoration is best-effort
        }

        // Stage settings files after whitespace restoration has cleaned them up
        foreach (var destinationId in touchedFolders)
        {
            var settingsPath = Path.Combine(uiPath, destinationId, "Settings.json");
            if (File.Exists(settingsPath))
            {
                _git?.StageFile(settingsPath);
            }
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

    /// <summary>
    /// Recursively deletes empty directories within the given path.
    /// A directory is considered empty if it contains no files and all subdirectories are also empty.
    /// This cleans up artifacts from previous botched upgrade runs.
    /// </summary>
    private static void DeleteEmptyDirectoriesRecursively(string path, bool isRoot = true)
    {
        if (!Directory.Exists(path))
        {
            return;
        }

        foreach (var subDirectory in Directory.GetDirectories(path))
        {
            DeleteEmptyDirectoriesRecursively(subDirectory, isRoot: false);
        }

        if (!isRoot && !Directory.EnumerateFileSystemEntries(path).Any())
        {
            Directory.Delete(path);
        }
    }

    private static List<LayoutSetMigrationPlan> BuildPlans(
        string uiPath,
        JsonArray sets,
        HashSet<string> subformReferencedSets
    )
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

            // A set referenced by a Subform component is never bound to a task — the v9 task-folder
            // layout is for top-level layouts. Ignore any 'tasks' it has and keep the folder name.
            var tasksArray = setObject["tasks"] as JsonArray;
            if (subformReferencedSets.Contains(sourceId) && tasksArray is { Count: > 0 })
            {
                UpgradeConsole.WriteLine(
                    $"Layout set '{sourceId}' is referenced by a Subform component; ignoring its 'tasks' entry and keeping it as a subform folder."
                );
                tasksArray = null;
            }

            plans.Add(
                new LayoutSetMigrationPlan(
                    sourceId,
                    sourcePath,
                    ResolveDestinationFolderIds(sourceId, tasksArray),
                    setObject["dataType"]?.GetValue<string>()
                )
            );
        }

        return plans;
    }

    /// <summary>
    /// Scans every layout JSON under <paramref name="uiPath"/> for Subform components and returns
    /// the set of <c>layoutSet</c> ids they reference. Tolerant of malformed files — they're skipped.
    /// </summary>
    private static HashSet<string> CollectSubformLayoutSetReferences(string uiPath)
    {
        var refs = new HashSet<string>(StringComparer.Ordinal);
        foreach (var setFolder in Directory.GetDirectories(uiPath))
        {
            var layoutsFolder = Path.Combine(setFolder, "layouts");
            if (!Directory.Exists(layoutsFolder))
            {
                continue;
            }

            foreach (var file in Directory.GetFiles(layoutsFolder, "*.json"))
            {
                JsonNode? root;
                try
                {
                    root = JsonNode.Parse(File.ReadAllText(file));
                }
                catch
                {
                    continue;
                }

                if (root?["data"]?["layout"] is not JsonArray layoutArray)
                {
                    continue;
                }

                CollectSubformReferencesFromNode(layoutArray, refs);
            }
        }

        return refs;
    }

    private static void CollectSubformReferencesFromNode(JsonNode? node, HashSet<string> refs)
    {
        switch (node)
        {
            case JsonArray array:
                foreach (var item in array)
                {
                    CollectSubformReferencesFromNode(item, refs);
                }
                break;
            case JsonObject obj:
                if (
                    obj["type"] is JsonValue typeValue
                    && typeValue.TryGetValue<string>(out var typeName)
                    && string.Equals(typeName, "Subform", StringComparison.OrdinalIgnoreCase)
                    && obj["layoutSet"] is JsonValue layoutSetValue
                    && layoutSetValue.TryGetValue<string>(out var layoutSetId)
                    && !string.IsNullOrWhiteSpace(layoutSetId)
                )
                {
                    refs.Add(layoutSetId);
                }
                foreach (var kvp in obj)
                {
                    CollectSubformReferencesFromNode(kvp.Value, refs);
                }
                break;
        }
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
                .ToList()
            ?? [];

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
        // Don't stage here — leave in working dir so the whitespace restoration
        // processor can detect and revert formatting-only changes against the index.
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
