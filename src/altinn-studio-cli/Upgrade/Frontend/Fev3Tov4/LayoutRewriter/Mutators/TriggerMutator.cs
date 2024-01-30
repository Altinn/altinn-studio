using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

/// <summary>
/// Upgrades trigger property
/// Should be run after group component and address mutations
/// </summary>
class TriggerMutator : ILayoutMutator
{
    private readonly bool preserveDefaultTriggers;

    public TriggerMutator(bool preserveDefaultTriggers) {
        this.preserveDefaultTriggers = preserveDefaultTriggers;
    }

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

        // TODO: Do we need to add standard validations to all components? Like options based components?
        // TODO: Change AddressComponent to Address
        var formComponentTypes = new List<string>() {"AddressComponent", "CheckBoxes", "Custom", "Datepicker", "Dropdown", "FileUpload", "FileUploadWithTag", "Grid", "Input", "Likert", "List", "Map", "MultipleSelect", "RadioButtons", "TextArea"};

        if (formComponentTypes.Contains(type))
        {
            if (component.TryGetPropertyValue("triggers", out var triggersNode))
            {
                component.Remove("triggers");

                if (
                    triggersNode is JsonArray triggersArray
                    && triggersArray
                        .Where(x => x is JsonValue && x.GetValueKind() == JsonValueKind.String)
                        .Select(x => x?.GetValue<string>())
                        is var triggers
                    && triggers.Contains("validation")
                )
                {
                    component.Add("showValidations", JsonNode.Parse(@"[""AllExceptRequired""]"));
                    return new ReplaceResult() { Component = component };
                }
            }
            if (this.preserveDefaultTriggers)
            {
                component.Add("showValidations", JsonNode.Parse(@"[""Schema"", ""Component""]"));
                return new ReplaceResult() { Component = component };
            }
        }

        if (type == "RepeatingGroup") 
        {
            if (component.TryGetPropertyValue("triggers", out var triggersNode))
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
        }

        if (type == "NavigationButtons") 
        {
            if (component.TryGetPropertyValue("triggers", out var triggersNode))
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
                        component.Add("validateOnNext", JsonNode.Parse(@"{""page"": ""currentAndPrevious"", ""show"": [""All""]}"));
                        return new ReplaceResult() { Component = component };
                    }
                }
            }
        }

        if (type == "NavigationBar") 
        {
            if (component.TryGetPropertyValue("triggers", out var triggersNode))
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
                        component.Add("validateOnForward", JsonNode.Parse(@"{""page"": ""currentAndPrevious"", ""show"": [""All""]}"));
                        return new ReplaceResult() { Component = component };
                    }
                }
            }
        }

        return new SkipResult();
    }
}
