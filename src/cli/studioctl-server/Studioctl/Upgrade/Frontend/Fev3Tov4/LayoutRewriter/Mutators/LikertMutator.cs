using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

/// <summary>
/// Converts Group + Likert to new Likert component
/// </summary>
internal sealed class LikertMutator : ILayoutMutator
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

        // Delete old likert component
        if (
            type == "Likert"
            && (
                !component.TryGetPropertyValue("dataModelBindings", out var oldLikertDmbNode)
                || oldLikertDmbNode is not JsonObject oldLikertDmbObject
                || !oldLikertDmbObject.ContainsKey(("questions")) && !oldLikertDmbObject.ContainsKey(("answer"))
            )
        )
        {
            return new DeleteResult();
        }

        if (
            type == "Group"
            // Check for maxCount > 1
            && component.TryGetPropertyValue("maxCount", out var maxCountNode)
            && maxCountNode is JsonValue maxCountValue
            && maxCountValue.GetValueKind() == JsonValueKind.Number
            && maxCountValue.GetValue<decimal>() > 1
            // Check for edit.mode == "likert"
            && component.TryGetPropertyValue("edit", out var editNode)
            && editNode is JsonObject editObject
            && editObject.TryGetPropertyValue("mode", out var modeNode)
            && modeNode is JsonValue modeValue
            && modeValue.GetValueKind() == JsonValueKind.String
            && modeValue.GetValue<string>() == "likert"
        )
        {
            component["type"] = "Likert";
            component.Remove("maxCount");

            // Move filter from edit to root
            if (editObject.TryGetPropertyValue("filter", out var filterNode))
            {
                component["filter"] = filterNode?.DeepClone();
            }
            component.Remove("edit");

            // Change group binding to questions
            if (
                !component.TryGetPropertyValue("dataModelBindings", out var groupDmbNode)
                || groupDmbNode is not JsonObject groupDmbObject
                || !groupDmbObject.TryGetPropertyValue("group", out var groupNode)
            )
            {
                return new ErrorResult() { Message = "Group (likert) is missing dataModelBindings.group" };
            }
            groupDmbObject.Add("questions", groupNode?.DeepClone());
            groupDmbObject.Remove("group");

            // Find id of likert component from children
            if (
                !component.TryGetPropertyValue("children", out var childrenNode)
                || childrenNode is not JsonArray childrenArray
                || childrenArray.Count != 1
                || childrenArray[0] is not JsonValue childIdValue
                || childIdValue.GetValueKind() != JsonValueKind.String
                || childIdValue.GetValue<string>() is var childId && childId is null
            )
            {
                return new ErrorResult()
                {
                    Message = "Group (likert) has invalid children, expected array with one string",
                };
            }

            // Find (old) likert component from lookup
            if (!componentLookup.TryGetValue(childId, out var likertComponent))
            {
                return new ErrorResult() { Message = $"Unable to find likert component with id {childId}" };
            }

            component.Remove("children");

            // Move textResourceBindings.title from likert to textResourceBindings.questions in group
            if (
                likertComponent.TryGetPropertyValue(("textResourceBindings"), out var likertTrbNode)
                && likertTrbNode is JsonObject likertTrbObject
                && likertTrbObject.TryGetPropertyValue("title", out var questionsTrb)
            )
            {
                if (
                    !component.TryGetPropertyValue("textResourceBindings", out var groupTrbNode)
                    || groupTrbNode is not JsonObject groupTrbObject
                )
                {
                    groupTrbObject = new JsonObject();
                    component["textResourceBindings"] = groupTrbObject;
                }
                groupTrbObject.Add("questions", questionsTrb?.DeepClone());
            }

            // Move dataModelBindings.simpleBinding from likert to group
            if (
                !likertComponent.TryGetPropertyValue("dataModelBindings", out var likertDmbNode)
                || likertDmbNode is not JsonObject likertDmbObject
                || !likertDmbObject.TryGetPropertyValue("simpleBinding", out var simpleBindingNode)
            )
            {
                return new ErrorResult() { Message = "Likert is missing dataModelBindings.simpleBinding" };
            }
            groupDmbObject.Add("answer", simpleBindingNode?.DeepClone());

            // Move standard properties from likert to group
            if (likertComponent.TryGetPropertyValue("options", out var optionsNode))
            {
                component["options"] = optionsNode?.DeepClone();
            }
            if (likertComponent.TryGetPropertyValue("optionsId", out var optionsIdNode))
            {
                component["optionsId"] = optionsIdNode?.DeepClone();
            }
            if (likertComponent.TryGetPropertyValue("secure", out var secureNode))
            {
                component["secure"] = secureNode?.DeepClone();
            }
            if (likertComponent.TryGetPropertyValue("sortOrder", out var sortOrderNode))
            {
                component["sortOrder"] = sortOrderNode?.DeepClone();
            }
            if (likertComponent.TryGetPropertyValue("source", out var sourceNode))
            {
                component["source"] = sourceNode?.DeepClone();
            }
            if (likertComponent.TryGetPropertyValue("required", out var requiredNode))
            {
                component["required"] = requiredNode?.DeepClone();
            }
            if (likertComponent.TryGetPropertyValue("readOnly", out var readOnlyNode))
            {
                component["readOnly"] = readOnlyNode?.DeepClone();
            }
            // Note: triggers are converted later
            if (likertComponent.TryGetPropertyValue("triggers", out var triggersNode))
            {
                component["triggers"] = triggersNode?.DeepClone();
            }

            return new ReplaceResult() { Component = component };
        }

        return new SkipResult();
    }
}
