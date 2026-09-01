using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.LayoutSetsMigration;

internal sealed class LayoutSetsToTaskUiMigrator
{
    private readonly string _projectFolder;

    public LayoutSetsToTaskUiMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
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

        var plans = BuildPlans(uiPath, sets);
        ValidateCollisions(uiPath, plans);

        var todos = new List<string>();
        var touchedFolders = new HashSet<string>(StringComparer.Ordinal);
        var copiedFolderCount = 0;
        var renamedFolderCount = 0;
        var deletedSourceFolderCount = 0;

        foreach (var plan in plans)
        {
            if (string.IsNullOrWhiteSpace(plan.DataType))
            {
                todos.Add(
                    $"Layout set '{plan.SourceId}' had no dataType in layout-sets.json; Settings.json will not get defaultDataType. Connect the datamodel in the process editor after upgrade."
                );
            }

            foreach (var destinationId in plan.DestinationIds)
            {
                var destinationPath = Path.Combine(uiPath, destinationId);
                if (!plan.SourcePath.Equals(destinationPath, StringComparison.Ordinal))
                {
                    if (plan.DestinationIds.Count == 1)
                    {
                        Directory.Move(plan.SourcePath, destinationPath);
                        renamedFolderCount++;
                    }
                    else
                    {
                        CopyDirectory(plan.SourcePath, destinationPath);
                        copiedFolderCount++;
                    }
                }

                touchedFolders.Add(destinationId);
                UpsertLayoutSetMetadata(destinationPath, plan.DataType, plan.Type);
            }

            if (plan.DestinationIds.Count > 1 && !plan.DestinationIds.Contains(plan.SourceId, StringComparer.Ordinal))
            {
                Directory.Delete(plan.SourcePath, recursive: true);
                deletedSourceFolderCount++;
            }
        }

        var migratedGlobalSettings = false;
        if (parsed["uiSettings"] is JsonObject { Count: > 0 } uiSettingsObject)
        {
            var globalSettingsPath = Path.Combine(uiPath, "Settings.json");
            var options = new JsonSerializerOptions { WriteIndented = true };
            File.WriteAllText(globalSettingsPath, uiSettingsObject.ToJsonString(options));
            migratedGlobalSettings = true;
        }

        // Restore whitespace-only changes to preserve original formatting in Settings.json files.
        try
        {
            var whitespaceRestorer = new WhitespaceRestorationProcessor(uiPath);
            whitespaceRestorer.RestoreWhitespaceOnlyChanges();
        }
        catch
        {
            // Non-fatal: whitespace restoration is best-effort
        }

        File.Delete(layoutSetsPath);

        return new MigrationResult
        {
            LayoutSetsDeleted = true,
            MigratedFolderCount = touchedFolders.Count,
            CopiedFolderCount = copiedFolderCount,
            RenamedFolderCount = renamedFolderCount,
            DeletedSourceFolderCount = deletedSourceFolderCount,
            MigratedGlobalSettings = migratedGlobalSettings,
            Todos = todos,
        };
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
                    setObject["dataType"]?.GetValue<string>(),
                    setObject["type"]?.GetValue<string>()
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
                .ToList()
            ?? [];

        if (taskIds.Count == 0)
        {
            return [sourceId];
        }

        return taskIds;
    }

    private void UpsertLayoutSetMetadata(string folderPath, string? dataType, string? type)
    {
        if (string.IsNullOrWhiteSpace(dataType) && string.IsNullOrWhiteSpace(type))
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

        if (!string.IsNullOrWhiteSpace(dataType))
        {
            settings["defaultDataType"] = dataType;
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            settings["type"] = type;
        }

        var options = new JsonSerializerOptions { WriteIndented = true };
        File.WriteAllText(settingsPath, settings.ToJsonString(options));
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
    public IReadOnlyList<string> Todos { get; init; } = [];
}

internal sealed record LayoutSetMigrationPlan(
    string SourceId,
    string SourcePath,
    List<string> DestinationIds,
    string? DataType,
    string? Type
);
