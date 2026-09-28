using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

/// <summary>
/// Converts boolean saveWhileTyping to a number, since v4 only accepts a timeout in milliseconds.
/// true meant the default and is removed; false has no numeric equivalent, so it becomes a long timeout.
/// </summary>
internal sealed class SaveWhileTypingMutator : ILayoutMutator
{
    private const int DisabledSaveWhileTypingTimeout = 4000;

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

        if (
            type is not ("Address" or "Input" or "TextArea")
            || !component.TryGetPropertyValue("saveWhileTyping", out var saveWhileTypingNode)
            || saveWhileTypingNode is not JsonValue saveWhileTypingValue
        )
        {
            return new SkipResult();
        }

        switch (saveWhileTypingValue.GetValueKind())
        {
            case JsonValueKind.True:
                component.Remove("saveWhileTyping");
                return new ReplaceResult() { Component = component };
            case JsonValueKind.False:
                component["saveWhileTyping"] = DisabledSaveWhileTypingTimeout;
                return new ReplaceResult()
                {
                    Component = component,
                    Warnings =
                    [
                        $"saveWhileTyping was false. Boolean values are no longer supported, so it was set to {DisabledSaveWhileTypingTimeout} milliseconds to wait considerably longer before saving while the user types than the default of 400 milliseconds. To further reduce the number of automatic saves, set autoSaveBehavior to onChangePage under pages in Settings.json.",
                    ],
                };
            default:
                return new SkipResult();
        }
    }
}
