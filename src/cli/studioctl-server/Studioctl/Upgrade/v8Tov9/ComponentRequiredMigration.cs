using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal sealed record ComponentRequiredMigrationResult(
    int FilesChanged,
    int PropertiesRemoved,
    MigrationResult Messages
);

/// <summary>
/// Migrates <c>required</c> properties that v9 no longer reads because requiredness is owned by
/// each component. Properties on components that still support <c>required</c> are left alone.
/// </summary>
internal sealed class ComponentRequiredMigration(string projectFolder)
{
    private static readonly IReadOnlyDictionary<string, string> _minimumProperties = new Dictionary<string, string>(
        StringComparer.Ordinal
    )
    {
        ["FileUpload"] = "minNumberOfAttachments",
        ["FileUploadWithTag"] = "minNumberOfAttachments",
        ["RepeatingGroup"] = "minCount",
    };

    private static readonly HashSet<string> _knownUnsupportedComponentTypes = new(StringComparer.Ordinal)
    {
        "Accordion",
        "AccordionGroup",
        "ActionButton",
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
        "SigningActions",
        "SigningDocumentList",
        "Summary",
        "Summary2",
        "Tabs",
        "Text",
        "Video",
    };

    public async Task<ComponentRequiredMigrationResult> Migrate()
    {
        var workspace = await LayoutMigrationWorkspace.Load(projectFolder);
        if (workspace is null)
            return new ComponentRequiredMigrationResult(0, 0, new MigrationResult());

        var result = Apply(workspace);
        await workspace.Save();
        return result;
    }

    internal static ComponentRequiredMigrationResult Apply(LayoutMigrationWorkspace workspace)
    {
        var messages = new List<UpgradeMessage>();
        var result = workspace.ApplyDocuments(document =>
        {
            var relativePath = Path.GetRelativePath(workspace.UiDirectory, document.FilePath).Replace('\\', '/');
            return MigrateComponents(document.Root, relativePath, messages);
        });
        return new ComponentRequiredMigrationResult(result.FilesChanged, result.Changes, new MigrationResult(messages));
    }

    private static int MigrateComponents(JsonNode node, string fileName, List<UpgradeMessage> messages)
    {
        var propertiesRemoved = 0;
        if (node is JsonObject component)
        {
            if (
                component["type"] is JsonValue typeValue
                && typeValue.TryGetValue<string>(out var type)
                && component.TryGetPropertyValue("required", out var requiredNode)
                && _knownUnsupportedComponentTypes.Contains(type)
            )
            {
                ReportConflict(component, type, requiredNode, fileName, messages);
                component.Remove("required");
                propertiesRemoved++;
            }

            foreach (var child in component.Select(static property => property.Value).ToList())
                if (child is not null)
                    propertiesRemoved += MigrateComponents(child, fileName, messages);
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array.ToList())
                if (child is not null)
                    propertiesRemoved += MigrateComponents(child, fileName, messages);
        }

        return propertiesRemoved;
    }

    private static void ReportConflict(
        JsonObject component,
        string type,
        JsonNode? requiredNode,
        string fileName,
        List<UpgradeMessage> messages
    )
    {
        if (
            !_minimumProperties.TryGetValue(type, out var minimumProperty)
            || requiredNode is not JsonValue requiredValue
            || !requiredValue.TryGetValue<bool>(out var required)
            || !component.TryGetPropertyValue(minimumProperty, out var minimumNode)
            || minimumNode is not JsonValue minimumValue
            || !minimumValue.TryGetValue<int>(out var minimum)
            || (minimum > 0) == required
        )
        {
            return;
        }

        var componentId = component["id"]?.GetValue<string>() ?? "<missing id>";
        messages.Todo(
            $"{fileName}: {type} '{componentId}' had conflicting requiredness: `required` is "
                + $"{required.ToString().ToLowerInvariant()} but `{minimumProperty}` is {minimum}. The upgrade removed "
                + "`required` and kept the minimum-count setting unchanged. Check that the remaining minimum expresses "
                + "what the app should require."
        );
    }
}
