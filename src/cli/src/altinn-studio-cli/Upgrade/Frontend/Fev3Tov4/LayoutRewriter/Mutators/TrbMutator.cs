using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

/// <summary>
/// Upgrades title/description text resource bindings for Groups and Repeating groups
/// Assumes that Group components have already been upgraded to new Group components
/// </summary>
internal sealed class TrbMutator : ILayoutMutator
{
    private readonly bool _convertGroupTitles;

    public TrbMutator(bool convertGroupTitles)
    {
        _convertGroupTitles = convertGroupTitles;
    }

    public IMutationResult Mutate(JsonObject component, Dictionary<string, JsonObject> componentLookup)
    {
        if (
            !component.TryGetPropertyValue("type", out var typeNode)
            || typeNode is not JsonValue typeValue
            || typeValue.GetValueKind() != JsonValueKind.String
            || typeValue.GetValue<string>() is var type && type is null
        )
        {
            return new ErrorResult() { Message = "Unable to parse component type" };
        }

        // Change body to description for group
        if (
            type == "Group"
            && component.TryGetPropertyValue("textResourceBindings", out var groupTrbNode)
            && groupTrbNode is JsonObject groupTrbObject
            && groupTrbObject.TryGetPropertyValue("body", out var groupBodyNode)
        )
        {
            groupTrbObject["description"] = groupBodyNode?.DeepClone();
            groupTrbObject.Remove("body");
            return new ReplaceResult() { Component = component };
        }

        // Change body to description and title to summary title for repeating group
        if (
            type == "RepeatingGroup"
            && component.TryGetPropertyValue("textResourceBindings", out var repeatingTrbNode)
            && repeatingTrbNode is JsonObject repeatingTrbObject
        )
        {
            if (repeatingTrbObject.TryGetPropertyValue("body", out var repeatingBodyNode))
            {
                repeatingTrbObject["description"] = repeatingBodyNode?.DeepClone();
                repeatingTrbObject.Remove("body");
            }

            if (_convertGroupTitles && repeatingTrbObject.TryGetPropertyValue("title", out var repeatingTitleNode))
            {
                repeatingTrbObject["summaryTitle"] = repeatingTitleNode?.DeepClone();
                repeatingTrbObject.Remove("title");
            }

            return new ReplaceResult() { Component = component };
        }

        return new SkipResult();
    }
}
