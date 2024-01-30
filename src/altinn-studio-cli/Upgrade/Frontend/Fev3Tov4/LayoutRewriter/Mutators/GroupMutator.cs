using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

/// <summary>
/// Upgrades groups with / without panel
/// </summary>
class GroupMutator : ILayoutMutator
{
    public override IMutationResult Mutate(
        JsonObject component,
        Dictionary<string, JsonObject> componentLookup
    )
    {
        if (
            !component.TryGetPropertyValue("type", out var typeNode)
            || typeNode is not JsonValue typeValue
            || typeValue.GetValueKind() != JsonValueKind.String
            || typeValue.GetValue<string>() is var type && type == null
        )
        {
            return new ErrorResult() { Message = "Unable to parse component type" };
        }

        if (
            type == "Group"
            && (
                !component.ContainsKey("maxCount")
                || component.TryGetPropertyValue("maxCount", out var maxCountNode)
                    && maxCountNode is JsonValue maxCountValue
                    && maxCountValue.GetValueKind() == JsonValueKind.Number
                    && maxCountValue.GetValue<decimal>() <= 1
            )
        )
        {
            if (component.ContainsKey("maxCount"))
            {
                component.Remove("maxCount");
            }
            if (component.TryGetPropertyValue("panel", out var panelNode))
            {
                // if panel has reference, delete the entire component and log warning
                if (panelNode is JsonObject panelObject && panelObject.ContainsKey("groupReference")) {
                    return new DeleteResult() { Warnings = new List<string>() {"Group with panel and groupReference is not supported in v4, deleting component"} };
                }

                // Change panel to new groupingIndicator
                component.Remove("panel");
                component["groupingIndicator"] = "panel";
            } 

            // Change old showGroupingIndicator to new groupingIndicator
            if (component.TryGetPropertyValue("showGroupingIndicator", out var showGroupingIndicatorNode)) {
                component.Remove("showGroupingIndicator");
                if (showGroupingIndicatorNode is JsonValue showGroupingIndicatorValue && showGroupingIndicatorValue.GetValueKind() == JsonValueKind.True) {
                    component["groupingIndicator"] = "indented";
                }

            }
                
            return new ReplaceResult() {Component = component};
        }

        return new SkipResult();
    }
}
