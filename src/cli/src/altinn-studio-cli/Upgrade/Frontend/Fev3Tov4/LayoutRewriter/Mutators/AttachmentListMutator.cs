using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

/// <summary>
/// Upgrades AttachmentList component
/// </summary>
internal sealed class AttachmentListMutator : ILayoutMutator
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

        if (type == "AttachmentList")
        {
            // Remove includePDF and update dataTypeIds if includePDF is true
            if (component.TryGetPropertyValue("includePDF", out var includePDFNode))
            {
                component.Remove("includePDF");
                if (includePDFNode is JsonValue includePDFValue && includePDFValue.GetValueKind() == JsonValueKind.True)
                {
                    if (
                        component.TryGetPropertyValue("dataTypeIds", out var dataTypeIdsNode1)
                        && dataTypeIdsNode1 is JsonArray dataTypeIdsArray1
                    )
                    {
                        dataTypeIdsArray1.Add(JsonValue.Create("ref-data-as-pdf"));
                    }
                    else
                    {
                        component["dataTypeIds"] = new JsonArray() { JsonValue.Create("ref-data-as-pdf") };
                    }
                    return new ReplaceResult() { Component = component };
                }
            }

            // If dataTypeIds is undefined, null or empty, set to current-task
            if (
                !component.TryGetPropertyValue("dataTypeIds", out var dataTypeIdsNode2)
                || dataTypeIdsNode2 is not JsonArray dataTypeIdsArray2
                || dataTypeIdsArray2.Count == 0
            )
            {
                component["dataTypeIds"] = new JsonArray() { JsonValue.Create("current-task") };
            }
            return new ReplaceResult() { Component = component };
        }

        return new SkipResult();
    }
}
