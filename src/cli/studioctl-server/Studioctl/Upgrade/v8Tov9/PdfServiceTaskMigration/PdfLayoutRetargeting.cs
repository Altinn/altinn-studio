using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;

/// <summary>
/// The outcome of <see cref="PdfLayoutRetargeting.Retarget"/>.
/// </summary>
/// <param name="ConvertedSummaries">Ids of the legacy Summary components converted to Summary2.</param>
/// <param name="ConvertedExcludedChildren">Whether any converted Summary had <c>excludedChildren</c>.</param>
/// <param name="DroppedProperties">Summary settings that Summary2 has no counterpart for, and were dropped.</param>
/// <param name="Blockers">
/// What in the layout refers to content only its task folder has. When there is any, the layout cannot
/// leave the task folder.
/// </param>
internal sealed record PdfLayoutRetargetingResult(
    IReadOnlyList<string> ConvertedSummaries,
    bool ConvertedExcludedChildren,
    IReadOnlyList<string> DroppedProperties,
    IReadOnlyList<string> Blockers
);

/// <summary>
/// Moves a task's custom PDF layout out of the task folder, into the layout set of a PDF service task.
/// There the layout's summaries must name the task, with <c>target.taskId</c>, to show its pages and
/// components; everything else in the layout must not depend on the folder it is in.
/// </summary>
internal static class PdfLayoutRetargeting
{
    /// <summary>
    /// Components that show only their own content or their data model's, so they render the same in any
    /// folder: the component types documented for PDF layouts, and newer ones like them.
    /// </summary>
    private static readonly HashSet<string> _staticTypes = new(StringComparer.Ordinal)
    {
        "Alert",
        "Date",
        "Divider",
        "Group",
        "Header",
        "Heading",
        "Image",
        "InstanceInformation",
        "Number",
        "Panel",
        "Paragraph",
        "Text",
    };

    /// <summary>
    /// Expression functions that name a component or a page, with the position of the argument that does.
    /// </summary>
    private static readonly Dictionary<string, int> _referencingFunctions = new(StringComparer.Ordinal)
    {
        ["component"] = 1,
        ["displayValue"] = 1,
        ["linkToComponent"] = 2,
        ["linkToPage"] = 2,
    };

    /// <summary>Summary settings that Summary2 has no counterpart for.</summary>
    private static readonly HashSet<string> _summaryOnlyProperties = new(StringComparer.Ordinal)
    {
        "display",
        "largeGroup",
        "textResourceBindings",
    };

    /// <summary>
    /// Points the summaries in <paramref name="layout"/> at task <paramref name="taskId"/>, in place:
    /// Summary2 targets get the task id, and legacy Summary components, which cannot show another task's
    /// components, become Summary2. Targets on the PDF layout itself are left to resolve there.
    /// </summary>
    public static PdfLayoutRetargetingResult Retarget(JsonNode? layout, string pdfLayoutName, string taskId)
    {
        var convertedSummaries = new List<string>();
        var convertedExcludedChildren = false;
        var droppedProperties = new SortedSet<string>(StringComparer.Ordinal);
        var blockers = new List<string>();

        if ((layout as JsonObject)?["data"] is not JsonObject data || data["layout"] is not JsonArray components)
            return new([], false, [], ["the file is not a layout (it has no data.layout array)"]);

        var pageComponentIds = components
            .Select(component => StringValue((component as JsonObject)?["id"]))
            .OfType<string>()
            .ToHashSet(StringComparer.Ordinal);

        // Page-level settings, such as a hidden expression, can refer to components too.
        foreach (var (name, value) in data.Where(property => property.Key != "layout"))
            AddReferenceBlockers(value, $"the page's {name}", pageComponentIds, pdfLayoutName, blockers);

        for (var index = 0; index < components.Count; index++)
        {
            if (components[index] is not JsonObject component)
            {
                blockers.Add("an entry in data.layout is not a component");
                continue;
            }

            var id = StringValue(component["id"]) ?? $"#{index + 1}";
            var subject = $"component '{id}'";
            AddReferenceBlockers(component, subject, pageComponentIds, pdfLayoutName, blockers);

            switch (StringValue(component["type"]))
            {
                case "Summary2":
                    if (!RetargetSummary2(component, pageComponentIds, pdfLayoutName, taskId))
                        blockers.Add($"{subject} has a target that is not an object");
                    break;
                case "Summary":
                    if (ConvertSummary(component, pageComponentIds, taskId, droppedProperties) is not { } summary2)
                    {
                        blockers.Add(
                            $"{subject} is a Summary without a componentRef, or with excludedChildren that are not ids"
                        );
                        break;
                    }

                    convertedExcludedChildren |= component.ContainsKey("excludedChildren");
                    components[index] = summary2;
                    convertedSummaries.Add(id);
                    break;
                case { } type when _staticTypes.Contains(type):
                    break;
                case { } type:
                    blockers.Add($"{subject} is a {type}, which the upgrade does not move out of a task folder");
                    break;
                default:
                    blockers.Add($"{subject} has no type");
                    break;
            }
        }

        return new(convertedSummaries, convertedExcludedChildren, [.. droppedProperties], [.. blockers.Distinct()]);
    }

    /// <summary>
    /// Points a Summary2 target at the task, unless it names a task already or is on the PDF layout itself.
    /// A Summary2 without a target summarizes the whole layout set. False when the target is not an object.
    /// </summary>
    private static bool RetargetSummary2(
        JsonObject summary2,
        HashSet<string> pageComponentIds,
        string pdfLayoutName,
        string taskId
    )
    {
        switch (summary2["target"])
        {
            case null:
                summary2["target"] = new JsonObject { ["type"] = "layoutSet", ["taskId"] = taskId };
                return true;
            case JsonObject target:
                // A target without a type is a component target.
                var type = StringValue(target["type"]) ?? "component";
                var targetId = StringValue(target["id"]);
                var isOnPdfLayout =
                    (type == "component" && targetId is not null && pageComponentIds.Contains(targetId))
                    || (type == "page" && targetId == pdfLayoutName);
                if (!target.ContainsKey("taskId") && !isOnPdfLayout)
                    target["taskId"] = taskId;
                return true;
            default:
                return false;
        }
    }

    /// <summary>
    /// The Summary2 equivalent of a legacy Summary, keeping its place and its settings Summary2 shares, or
    /// null when the Summary cannot be converted. <c>componentRef</c> becomes a component target and
    /// <c>excludedChildren</c> become overrides that hide those children.
    /// </summary>
    private static JsonObject? ConvertSummary(
        JsonObject summary,
        HashSet<string> pageComponentIds,
        string taskId,
        SortedSet<string> droppedProperties
    )
    {
        if (StringValue(summary["componentRef"]) is not { } componentRef)
            return null;

        JsonArray? overrides = null;
        if (summary.ContainsKey("excludedChildren"))
        {
            if (summary["excludedChildren"] is not JsonArray excludedChildren)
                return null;

            var childIds = excludedChildren.Select(StringValue).ToList();
            if (childIds.Contains(null))
                return null;

            overrides =
            [
                .. childIds.Select(childId => new JsonObject { ["componentId"] = childId, ["hidden"] = true }),
            ];
        }

        var target = new JsonObject { ["type"] = "component", ["id"] = componentRef };
        if (!pageComponentIds.Contains(componentRef))
            target["taskId"] = taskId;

        var summary2 = new JsonObject();
        foreach (var (name, value) in summary)
        {
            switch (name)
            {
                case "type":
                    summary2["type"] = "Summary2";
                    break;
                case "componentRef":
                    summary2["target"] = target;
                    break;
                case "excludedChildren":
                    summary2["overrides"] = overrides;
                    break;
                default:
                    if (_summaryOnlyProperties.Contains(name))
                        droppedProperties.Add(name);
                    else
                        summary2[name] = value?.DeepClone();
                    break;
            }
        }

        return summary2;
    }

    private static void AddReferenceBlockers(
        JsonNode? node,
        string subject,
        HashSet<string> pageComponentIds,
        string pdfLayoutName,
        List<string> blockers
    )
    {
        foreach (var (function, argument) in FindReferences(node))
        {
            var isPageLink = function == "linkToPage";
            if (StringValue(argument) is not { } name)
            {
                blockers.Add(
                    $"{subject} refers to a {(isPageLink ? "page" : "component")} through an expression the upgrade "
                        + "cannot resolve"
                );
            }
            else if (isPageLink ? name != pdfLayoutName : !pageComponentIds.Contains(name))
            {
                blockers.Add(
                    isPageLink ? $"{subject} links to page '{name}'" : $"{subject} refers to component '{name}'"
                );
            }
        }
    }

    /// <summary>
    /// Every call of an expression function that names a component or a page, anywhere in
    /// <paramref name="node"/>, with the argument that names it. Arrays that merely look like such a call
    /// are included too, which can only keep a layout in its task folder, never break it.
    /// </summary>
    private static IEnumerable<(string Function, JsonNode? Argument)> FindReferences(JsonNode? node)
    {
        switch (node)
        {
            case JsonArray array:
                if (
                    array.Count > 0
                    && StringValue(array[0]) is { } function
                    && _referencingFunctions.TryGetValue(function, out var position)
                    && position < array.Count
                )
                {
                    yield return (function, array[position]);
                }

                foreach (var reference in array.SelectMany(FindReferences))
                    yield return reference;
                break;
            case JsonObject jsonObject:
                foreach (var reference in jsonObject.Select(property => property.Value).SelectMany(FindReferences))
                    yield return reference;
                break;
        }
    }

    private static string? StringValue(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;
}
