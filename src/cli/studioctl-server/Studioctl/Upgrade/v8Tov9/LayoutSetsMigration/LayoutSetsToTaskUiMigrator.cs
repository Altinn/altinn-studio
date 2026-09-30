using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.LayoutSetsMigration;

internal sealed class LayoutSetsToTaskUiMigrator
{
    /// <summary>Layout files may have comments and trailing commas, which the app accepts.</summary>
    private static readonly JsonDocumentOptions _layoutOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

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

        var subformReferencedSets = CollectSubformLayoutSetReferences(uiPath);
        var plans = BuildPlans(uiPath, sets, subformReferencedSets);
        var collisionTodos = FindCollisionTodos(uiPath, plans);
        if (collisionTodos.Count > 0)
            return new MigrationResult { Todos = collisionTodos };

        // Clean up empty folders from previous botched runs only after the complete plan has passed
        // preflight. A migration that needs manual input must leave the UI tree untouched.
        DeleteEmptyDirectoriesRecursively(uiPath);

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
                if (
                    !plan.SourcePath.Equals(destinationPath, StringComparison.Ordinal)
                    && Directory.Exists(plan.SourcePath)
                )
                {
                    CopyDirectory(plan.SourcePath, destinationPath);
                    if (plan.DestinationIds.Count == 1)
                        renamedFolderCount++;
                    else
                        copiedFolderCount++;
                }

                touchedFolders.Add(destinationId);
                UpsertLayoutSetMetadata(destinationPath, plan.DataType, plan.Type);
            }
        }

        // Delete sources only after every destination is complete. If the process stops before this
        // point, a rerun can safely continue copying into the compatible destination folders.
        foreach (var plan in plans)
        {
            if (
                Directory.Exists(plan.SourcePath)
                && !plan.DestinationIds.Contains(plan.SourceId, StringComparer.Ordinal)
            )
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

            // A set referenced by a Subform component is never bound to a task — the v9 task-folder
            // layout is for top-level layouts. Ignore any 'tasks' it has and keep the folder name.
            var tasks = subformReferencedSets.Contains(sourceId) ? null : setObject["tasks"] as JsonArray;
            var destinationIds = ResolveDestinationFolderIds(sourceId, tasks);
            var sourcePath = Path.Combine(uiPath, sourceId);
            if (!Directory.Exists(sourcePath) && destinationIds.Any(id => !Directory.Exists(Path.Combine(uiPath, id))))
                throw new InvalidOperationException(
                    $"Missing UI folder for layout set '{sourceId}', and its task folders are incomplete."
                );

            plans.Add(
                new LayoutSetMigrationPlan(
                    sourceId,
                    sourcePath,
                    destinationIds,
                    setObject["dataType"]?.GetValue<string>(),
                    setObject["type"]?.GetValue<string>()
                )
            );
        }

        return plans;
    }

    /// <summary>
    /// Scans every layout JSON under <paramref name="uiPath"/> for Subform components and returns
    /// the set of <c>layoutSet</c> ids they reference. Malformed files, and JSON that is not a layout, are
    /// skipped.
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
                    root = JsonNode.Parse(File.ReadAllText(file), documentOptions: _layoutOptions);
                }
                catch (JsonException)
                {
                    continue;
                }

                if (
                    root is not JsonObject rootObject
                    || rootObject["data"] is not JsonObject data
                    || data["layout"] is not JsonArray layoutArray
                )
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

    private static List<string> FindCollisionTodos(string uiPath, List<LayoutSetMigrationPlan> plans)
    {
        var todos = new List<string>();
        var claimedDestinations = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var plan in plans)
        {
            foreach (var destinationId in plan.DestinationIds)
            {
                var destinationPath = Path.Combine(uiPath, destinationId);
                if (File.Exists(destinationPath))
                {
                    todos.Add(
                        $"Layout set '{plan.SourceId}' maps to '{destinationId}', but that path is a file. Resolve the collision and rerun; layout-sets.json and source folders were kept."
                    );
                    continue;
                }
                if (
                    !plan.SourcePath.Equals(destinationPath, StringComparison.Ordinal)
                    && Directory.Exists(destinationPath)
                    && Directory.Exists(plan.SourcePath)
                    && !CanResumeCopy(plan.SourcePath, destinationPath)
                )
                {
                    todos.Add(
                        $"Layout set '{plan.SourceId}' maps to task folder '{destinationId}', but that folder already exists. "
                            + "Resolve the folder collision, then run the upgrade again; layout-sets.json was kept."
                    );
                    continue;
                }

                if (claimedDestinations.TryGetValue(destinationId, out var previousSourceId))
                {
                    if (!string.Equals(previousSourceId, plan.SourceId, StringComparison.Ordinal))
                    {
                        todos.Add(
                            $"Layout sets '{previousSourceId}' and '{plan.SourceId}' both map to task folder "
                                + $"'{destinationId}'. Consolidate or rename them manually, then run the upgrade again; "
                                + "layout-sets.json and all source folders were kept."
                        );
                    }
                }
                else
                {
                    claimedDestinations[destinationId] = plan.SourceId;
                }
            }
        }

        return todos.Distinct(StringComparer.Ordinal).ToList();
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
            if (!File.Exists(destinationFile))
            {
                File.Copy(file, destinationFile);
                continue;
            }

            if (
                !Path.GetFileName(file).Equals("Settings.json", StringComparison.Ordinal)
                && !File.ReadAllBytes(file).AsSpan().SequenceEqual(File.ReadAllBytes(destinationFile))
            )
            {
                throw new InvalidOperationException(
                    $"Cannot resume task-folder migration because {destinationFile} differs from its source."
                );
            }
        }

        foreach (var subDirectory in Directory.GetDirectories(sourceDir))
        {
            var destinationSubDirectory = Path.Combine(destinationDir, Path.GetFileName(subDirectory));
            CopyDirectory(subDirectory, destinationSubDirectory);
        }
    }

    private static bool CanResumeCopy(string sourceDir, string destinationDir)
    {
        foreach (var destinationFile in Directory.EnumerateFiles(destinationDir))
        {
            var fileName = Path.GetFileName(destinationFile);
            if (fileName.Equals("Settings.json", StringComparison.Ordinal))
                continue;

            var sourceFile = Path.Combine(sourceDir, fileName);
            if (
                !File.Exists(sourceFile)
                || !File.ReadAllBytes(sourceFile).AsSpan().SequenceEqual(File.ReadAllBytes(destinationFile))
            )
                return false;
        }

        foreach (var destinationSubDirectory in Directory.EnumerateDirectories(destinationDir))
        {
            var sourceSubDirectory = Path.Combine(sourceDir, Path.GetFileName(destinationSubDirectory));
            if (!Directory.Exists(sourceSubDirectory) || !CanResumeCopy(sourceSubDirectory, destinationSubDirectory))
                return false;
        }

        return true;
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
