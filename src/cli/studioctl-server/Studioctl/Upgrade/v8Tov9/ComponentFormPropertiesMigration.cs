using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal sealed record ComponentFormPropertiesMigrationResult(
    int FilesChanged,
    int PropertiesRemoved,
    MigrationResult Messages
);

/// <summary>
/// Removes <c>required</c> and <c>readOnly</c> properties from known components that no longer
/// support them in v9. Supported properties and unknown component types are left alone.
/// </summary>
internal sealed class ComponentFormPropertiesMigration(string projectFolder)
{
    private static readonly IReadOnlyDictionary<string, string> _minimumProperties = new Dictionary<string, string>(
        StringComparer.Ordinal
    )
    {
        ["FileUpload"] = "minNumberOfAttachments",
        ["FileUploadWithTag"] = "minNumberOfAttachments",
        ["RepeatingGroup"] = "minCount",
    };

    private static readonly HashSet<string> _knownUnsupportedRequiredComponentTypes = new(StringComparer.Ordinal)
    {
        "Accordion",
        "AccordionGroup",
        "ActionButton",
        "AddToList",
        "Alert",
        "AttachmentList",
        "Audio",
        "Button",
        "ButtonGroup",
        "Cards",
        "CustomButton",
        "Date",
        "Divider",
        "FileUpload",
        "FileUploadWithTag",
        "Grid",
        "Group",
        "Heading",
        "IFrame",
        "Image",
        "InstanceInformation",
        "InstantiationButton",
        "Link",
        "NavigationBar",
        "NavigationButtons",
        "Number",
        "Option",
        "Panel",
        "Paragraph",
        "Payment",
        "PaymentDetails",
        "PDFPreviewButton",
        "PrintButton",
        "RepeatingGroup",
        "SigneeList",
        "SimpleTable",
        "SigningActions",
        "SigningDocumentList",
        "Subform",
        "Summary",
        "Summary2",
        "Tabs",
        "Text",
        "Video",
    };

    private static readonly HashSet<string> _knownUnsupportedReadOnlyComponentTypes = new(StringComparer.Ordinal)
    {
        "AddToList",
        "List",
        "SimpleTable",
        "Subform",
    };

    public async Task<ComponentFormPropertiesMigrationResult> Migrate()
    {
        var workspace = await LayoutMigrationWorkspace.Load(projectFolder);
        if (workspace is null)
            return new ComponentFormPropertiesMigrationResult(0, 0, new MigrationResult());

        var result = Apply(workspace);
        await workspace.Save();
        return result;
    }

    internal static ComponentFormPropertiesMigrationResult Apply(LayoutMigrationWorkspace workspace)
    {
        var messages = new List<UpgradeMessage>();
        var result = workspace.ApplyDocuments(document =>
        {
            var relativePath = Path.GetRelativePath(workspace.UiDirectory, document.FilePath).Replace('\\', '/');
            return MigrateComponents(document.Root, relativePath, workspace.UiDirectory, messages);
        });
        return new ComponentFormPropertiesMigrationResult(
            result.FilesChanged,
            result.Changes,
            new MigrationResult(messages)
        );
    }

    private static int MigrateComponents(
        JsonNode node,
        string fileName,
        string uiDirectory,
        List<UpgradeMessage> messages
    )
    {
        if (
            node is not JsonObject root
            || root["data"] is not JsonObject data
            || data["layout"] is not JsonArray components
        )
            return 0;

        var propertiesRemoved = 0;
        foreach (var component in components.OfType<JsonObject>())
        {
            if (component["type"] is not JsonValue typeValue || !typeValue.TryGetValue<string>(out var type))
                continue;

            if (
                _knownUnsupportedRequiredComponentTypes.Contains(type)
                && component.TryGetPropertyValue("required", out var requiredNode)
            )
            {
                ReportConflict(component, type, requiredNode, fileName, uiDirectory, messages);
                component.Remove("required");
                propertiesRemoved++;
            }

            if (_knownUnsupportedReadOnlyComponentTypes.Contains(type) && component.Remove("readOnly"))
                propertiesRemoved++;
        }

        return propertiesRemoved;
    }

    private static void ReportConflict(
        JsonObject component,
        string type,
        JsonNode? requiredNode,
        string fileName,
        string uiDirectory,
        List<UpgradeMessage> messages
    )
    {
        if (requiredNode is not JsonValue requiredValue || !requiredValue.TryGetValue<bool>(out var required))
        {
            return;
        }

        var componentId =
            component["id"] is JsonValue idValue && idValue.TryGetValue<string>(out var id) ? id : "<missing id>";
        int minimum;
        string minimumDescription;
        if (type == "Subform")
        {
            if (!TryGetSubformMinimum(uiDirectory, component, out var dataType, out minimum))
            {
                messages.Todo(
                    $"{fileName}: Subform '{componentId}' had `required` set to {required.ToString().ToLowerInvariant()}. "
                        + "The upgrade removed `required`, but could not resolve its data type's `minCount` through "
                        + "`layoutSet`, Settings.json and config/applicationmetadata.json. These files were left "
                        + "unchanged. Check that the target data type's minimum expresses what the app should require."
                );
                return;
            }
            minimumDescription = $"`minCount` for data type '{dataType}' in config/applicationmetadata.json";
        }
        else
        {
            if (!_minimumProperties.TryGetValue(type, out var minimumProperty))
                return;

            if (!component.TryGetPropertyValue(minimumProperty, out var minimumNode))
            {
                minimum = 0;
                minimumDescription = $"the default `{minimumProperty}`";
            }
            else
            {
                if (minimumNode is not JsonValue minimumValue || !minimumValue.TryGetValue<int>(out minimum))
                    return;
                minimumDescription = $"`{minimumProperty}`";
            }
        }

        if ((minimum > 0) == required)
            return;

        messages.Todo(
            $"{fileName}: {type} '{componentId}' had conflicting requiredness: `required` is "
                + $"{required.ToString().ToLowerInvariant()} but {minimumDescription} is {minimum}. The upgrade removed "
                + "`required` and kept the minimum-count setting unchanged. Check that the remaining minimum expresses "
                + "what the app should require."
        );
    }

    private static bool TryGetSubformMinimum(
        string uiDirectory,
        JsonObject component,
        out string dataType,
        out int minimum
    )
    {
        dataType = "";
        minimum = 0;
        if (
            component["layoutSet"] is not JsonValue layoutSetValue
            || !layoutSetValue.TryGetValue<string>(out var layoutSet)
            || string.IsNullOrWhiteSpace(layoutSet)
            || layoutSet.IndexOfAny(Path.GetInvalidPathChars()) >= 0
        )
            return false;

        var settingsPath = Path.Combine(uiDirectory, layoutSet, "Settings.json");
        var relativePath = Path.GetRelativePath(uiDirectory, settingsPath);
        if (
            Path.IsPathRooted(relativePath)
            || relativePath.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal)
        )
            return false;

        var settings = ReadJsonObject(settingsPath);
        if (
            settings?["defaultDataType"] is not JsonValue dataTypeValue
            || !dataTypeValue.TryGetValue<string>(out var defaultDataType)
            || string.IsNullOrWhiteSpace(defaultDataType)
        )
            return false;

        dataType = defaultDataType;
        var metadataPath = Path.Combine(uiDirectory, "..", "config", "applicationmetadata.json");
        var metadata = ReadJsonObject(metadataPath);
        var definition = (metadata?["dataTypes"] as JsonArray)
            ?.OfType<JsonObject>()
            .FirstOrDefault(dt =>
                dt["id"] is JsonValue idValue && idValue.TryGetValue<string>(out var id) && id == defaultDataType
            );
        return definition?["minCount"] is JsonValue minimumValue && minimumValue.TryGetValue(out minimum);
    }

    private static JsonObject? ReadJsonObject(string path)
    {
        try
        {
            return JsonNode.Parse(
                    File.ReadAllText(path),
                    new JsonNodeOptions { PropertyNameCaseInsensitive = true },
                    new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
                ) as JsonObject;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or JsonException)
        {
            return null;
        }
    }
}
