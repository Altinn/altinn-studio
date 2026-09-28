using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

/// <summary>
/// Converts boolean saveWhileTyping to a number, since v4 only accepts a timeout in milliseconds.
/// true meant the default and is removed; false has no numeric equivalent, so it becomes a long timeout.
/// The replaced false values are reported in one warning from <see cref="GetWarning"/> rather than
/// per component, so an app with many of them does not get the same explanation repeated.
/// </summary>
internal sealed class SaveWhileTypingMutator : ILayoutMutator
{
    private const int DisabledSaveWhileTypingTimeout = 4000;

    private readonly List<string> _disabledComponents = [];

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
                _disabledComponents.Add($"{type} {component["id"]}");
                return new ReplaceResult() { Component = component };
            default:
                return new SkipResult();
        }
    }

    /// <returns>The warning about replaced false values, or null when there were none.</returns>
    public string? GetWarning() =>
        _disabledComponents.Count == 0
            ? null
            : $"saveWhileTyping was false on {_disabledComponents.Count} component(s): {string.Join(", ", _disabledComponents)}. Boolean values are no longer supported, so they were set to {DisabledSaveWhileTypingTimeout} milliseconds to wait considerably longer before saving while the user types than the default of 400 milliseconds. To further reduce the number of automatic saves, set autoSaveBehavior to onChangePage under pages in Settings.json.";
}
