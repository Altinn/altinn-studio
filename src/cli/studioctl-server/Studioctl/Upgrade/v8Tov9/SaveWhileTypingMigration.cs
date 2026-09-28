using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Converts boolean <c>saveWhileTyping</c> values, which v3 accepted and v4 silently ignores, to the
/// number of milliseconds the frontend now expects. <c>true</c> meant the default and is removed;
/// <c>false</c> has no numeric equivalent, so it becomes a long timeout and produces a warning.
/// </summary>
internal static class SaveWhileTypingMigration
{
    private const int DisabledSaveWhileTypingTimeout = 4000;

    private static readonly HashSet<string> _componentsWithSaveWhileTyping = new(StringComparer.Ordinal)
    {
        "Address",
        "Input",
        "TextArea",
    };

    public static async Task<string?> Migrate(string projectFolder)
    {
        var workspace = await LayoutMigrationWorkspace.Load(projectFolder);
        if (workspace is null)
            return null;

        var warning = Apply(workspace);
        await workspace.Save();
        return warning;
    }

    /// <returns>The warning about replaced <c>false</c> values, or <c>null</c> when there were none.</returns>
    internal static string? Apply(LayoutMigrationWorkspace workspace)
    {
        var disabledComponents = new List<DisabledComponent>();
        workspace.ApplyDocuments(document => MigrateNode(document.Root, document.FilePath, disabledComponents));
        return disabledComponents.Count == 0 ? null : DisabledWarning(disabledComponents);
    }

    /// <summary>
    /// Explains the replaced <c>false</c> values once and lists every affected component, so an app
    /// with many of them gets one warning instead of the same explanation repeated per component.
    /// Only file names are shown, since a later step moves layout-set folders to task folders.
    /// </summary>
    private static string DisabledWarning(List<DisabledComponent> disabledComponents)
    {
        var locations = disabledComponents
            .GroupBy(component => component.FilePath, StringComparer.Ordinal)
            .Select(file =>
                $"{Path.GetFileName(file.Key)} ({string.Join(", ", file.Select(component => $"{component.Type} '{component.Id}'"))})"
            );
        return $"`saveWhileTyping` was set to `false` on {disabledComponents.Count} component(s): "
            + $"{string.Join(", ", locations)}. Boolean values are no longer supported, so they were set to "
            + $"{DisabledSaveWhileTypingTimeout} milliseconds to wait considerably longer before saving while the "
            + "user types than the default of 400 milliseconds. To further reduce the number of automatic saves, "
            + "set `autoSaveBehavior` to `onChangePage`, either for all tasks in App/ui/Settings.json or for one "
            + "task under `pages` in App/ui/<task>/Settings.json.";
    }

    private static int MigrateNode(JsonNode node, string filePath, List<DisabledComponent> disabledComponents)
    {
        var changes = 0;
        if (node is JsonObject obj)
        {
            if (MigrateComponent(obj, filePath, disabledComponents))
                changes++;

            foreach (var child in obj.Select(property => property.Value).ToList())
            {
                if (child is not null)
                    changes += MigrateNode(child, filePath, disabledComponents);
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array.ToList())
            {
                if (child is not null)
                    changes += MigrateNode(child, filePath, disabledComponents);
            }
        }

        return changes;
    }

    private static bool MigrateComponent(
        JsonObject component,
        string filePath,
        List<DisabledComponent> disabledComponents
    )
    {
        if (
            component["type"] is not JsonValue typeValue
            || !typeValue.TryGetValue<string>(out var type)
            || !_componentsWithSaveWhileTyping.Contains(type)
            || component["saveWhileTyping"] is not JsonValue saveWhileTyping
        )
        {
            return false;
        }

        switch (saveWhileTyping.GetValueKind())
        {
            case JsonValueKind.True:
                component.Remove("saveWhileTyping");
                return true;
            case JsonValueKind.False:
                component["saveWhileTyping"] = DisabledSaveWhileTypingTimeout;
                disabledComponents.Add(new DisabledComponent(filePath, type, ComponentId(component)));
                return true;
            default:
                return false;
        }
    }

    private static string ComponentId(JsonObject component) =>
        component["id"] is JsonValue idValue && idValue.TryGetValue<string>(out var id) ? id : "<unknown>";

    private sealed record DisabledComponent(string FilePath, string Type, string Id);
}
