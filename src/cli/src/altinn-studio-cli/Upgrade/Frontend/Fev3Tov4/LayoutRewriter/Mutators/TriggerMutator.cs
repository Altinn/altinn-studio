using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

/// <summary>
/// Upgrades trigger property
/// Should be run after group component and address mutations
/// </summary>
internal sealed class TriggerMutator : ILayoutMutator
{
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

        JsonNode? triggersNode = null;

        var formComponentTypes = new List<string>()
        {
            "Address",
            "Checkboxes",
            "Custom",
            "Datepicker",
            "Dropdown",
            "FileUpload",
            "FileUploadWithTag",
            "Grid",
            "Input",
            "Likert",
            "List",
            "Map",
            "MultipleSelect",
            "RadioButtons",
            "TextArea",
        };
        if (formComponentTypes.Contains(type))
        {
            // "showValidations": ["AllExceptRequired"] is now default in v4, so no additional changes are needed.
            if (component.TryGetPropertyValue("triggers", out triggersNode))
            {
                component.Remove("triggers");
            }

            // Removing redundant "showValidations": ["AllExceptRequired"] from previous upgrade runs.
            if (
                component.TryGetPropertyValue("showValidations", out var showValidationsNode)
                && showValidationsNode is JsonArray showValidationsArray
                && showValidationsArray
                    .Where(x => x is JsonValue && x.GetValueKind() == JsonValueKind.String)
                    .Select(x => x?.GetValue<string>())
                    is var showValidationsValues
                && showValidationsValues.Count() == 1
                && showValidationsValues.Contains("AllExceptRequired")
            )
            {
                component.Remove("showValidations");
            }

            return new ReplaceResult() { Component = component };
        }

        if (type == "RepeatingGroup" && component.TryGetPropertyValue("triggers", out triggersNode))
        {
            component.Remove("triggers");

            if (
                triggersNode is JsonArray triggersArray
                && triggersArray
                    .Where(x => x is JsonValue && x.GetValueKind() == JsonValueKind.String)
                    .Select(x => x?.GetValue<string>())
                    is var triggers
                && (triggers.Contains("validation") || triggers.Contains("validateRow"))
            )
            {
                component.Add("validateOnSaveRow", JsonNode.Parse(@"[""All""]"));
                return new ReplaceResult() { Component = component };
            }
        }

        if (type == "NavigationButtons" && component.TryGetPropertyValue("triggers", out triggersNode))
        {
            component.Remove("triggers");

            if (
                triggersNode is JsonArray triggersArray
                && triggersArray
                    .Where(x => x is JsonValue && x.GetValueKind() == JsonValueKind.String)
                    .Select(x => x?.GetValue<string>())
                    is var triggers
            )
            {
                if (triggers.Contains("validatePage"))
                {
                    component.Add("validateOnNext", JsonNode.Parse(@"{""page"": ""current"", ""show"": [""All""]}"));
                    return new ReplaceResult() { Component = component };
                }

                if (triggers.Contains("validateAllPages"))
                {
                    component.Add("validateOnNext", JsonNode.Parse(@"{""page"": ""all"", ""show"": [""All""]}"));
                    return new ReplaceResult() { Component = component };
                }

                if (triggers.Contains("validateCurrentAndPreviousPages"))
                {
                    component.Add(
                        "validateOnNext",
                        JsonNode.Parse(@"{""page"": ""currentAndPrevious"", ""show"": [""All""]}")
                    );
                    return new ReplaceResult() { Component = component };
                }
            }
        }

        if (type == "NavigationBar" && component.TryGetPropertyValue("triggers", out triggersNode))
        {
            component.Remove("triggers");

            if (
                triggersNode is JsonArray triggersArray
                && triggersArray
                    .Where(x => x is JsonValue && x.GetValueKind() == JsonValueKind.String)
                    .Select(x => x?.GetValue<string>())
                    is var triggers
            )
            {
                if (triggers.Contains("validatePage"))
                {
                    component.Add("validateOnForward", JsonNode.Parse(@"{""page"": ""current"", ""show"": [""All""]}"));
                    return new ReplaceResult() { Component = component };
                }

                if (triggers.Contains("validateAllPages"))
                {
                    component.Add("validateOnForward", JsonNode.Parse(@"{""page"": ""all"", ""show"": [""All""]}"));
                    return new ReplaceResult() { Component = component };
                }

                if (triggers.Contains("validateCurrentAndPreviousPages"))
                {
                    component.Add(
                        "validateOnForward",
                        JsonNode.Parse(@"{""page"": ""currentAndPrevious"", ""show"": [""All""]}")
                    );
                    return new ReplaceResult() { Component = component };
                }
            }
        }

        return new SkipResult();
    }
}
