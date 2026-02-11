using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.LayoutSetsMigration;

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
                UpsertDefaultDataType(destinationPath, plan.DataType);
            }

            if (plan.DestinationIds.Count > 1 && !plan.DestinationIds.Contains(plan.SourceId, StringComparer.Ordinal))
            {
                Directory.Delete(plan.SourcePath, recursive: true);
                deletedSourceFolderCount++;
            }
        }

        var uiSettingsNode = parsed["uiSettings"];
        if (uiSettingsNode is not null)
        {
            var globalSettingsPath = Path.Combine(uiPath, "Settings.json");
            var options = new JsonSerializerOptions { WriteIndented = true };
            File.WriteAllText(globalSettingsPath, uiSettingsNode.ToJsonString(options));
        }

        File.Delete(layoutSetsPath);

        return new MigrationResult
        {
            LayoutSetsDeleted = true,
            MigratedFolderCount = touchedFolders.Count,
            CopiedFolderCount = copiedFolderCount,
            RenamedFolderCount = renamedFolderCount,
            DeletedSourceFolderCount = deletedSourceFolderCount,
            MigratedGlobalSettings = uiSettingsNode is not null,
        };
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

    private static void UpsertDefaultDataType(string folderPath, string? dataType)
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
