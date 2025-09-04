using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

/// <summary>
/// Cleans up properties that are no longer allowed
/// </summary>
internal sealed class PropertyCleanupMutator : ILayoutMutator
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

        if (component.ContainsKey("componentType"))
        {
            component.Remove("componentType");
        }

        if (component.ContainsKey("triggers"))
        {
            component.Remove("triggers");
        }

        if (component.ContainsKey("textResourceId"))
        {
            component.Remove("textResourceId");
        }

        if (component.ContainsKey("customType"))
        {
            component.Remove("customType");
        }

        if (component.ContainsKey("description"))
        {
            component.Remove("description");
        }

        if (component.ContainsKey("pageRef"))
        {
            component.Remove("pageRef");
        }

        // All non-form components
        if (!formComponentTypes.Contains(type))
        {
            if (component.ContainsKey("required"))
            {
                component.Remove("required");
            }

            if (component.ContainsKey("readOnly"))
            {
                component.Remove("readOnly");
            }
        }

        if (
            type != "RepeatingGroup"
            && !formComponentTypes.Contains(type)
            && component.ContainsKey("dataModelBindings")
        )
        {
            component.Remove("dataModelBindings");
        }

        if (
            (type == "FileUpload" || type == "FileUploadWithTag")
            && component.TryGetPropertyValue("dataModelBindings", out var fileDmb)
            && fileDmb is JsonObject fileDmbObject
            && fileDmbObject.Count == 0
        )
        {
            component.Remove("dataModelBindings");
        }

        if (type == "Paragraph" && component.ContainsKey("size"))
        {
            component.Remove("size");
        }

        if (type == "Panel" && component.ContainsKey("size"))
        {
            component.Remove("size");
        }

        if (type == "NavigationBar" && component.ContainsKey("textResourceBindings"))
        {
            component.Remove("textResourceBindings");
        }

        return new ReplaceResult() { Component = component };
    }
}
