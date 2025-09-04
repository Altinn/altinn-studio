using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

/// <summary>
/// Upgrades repeating groups to new repeating group component
/// This assumes that likert has already been converted to new likert component
/// </summary>
internal sealed class RepeatingGroupMutator : ILayoutMutator
{
    public IMutationResult Mutate(JsonObject component, Dictionary<string, JsonObject> componentLookup)
    {
        var warnings = new List<string>();
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
            type == "Group"
            // Check for maxCount > 1
            && component.TryGetPropertyValue("maxCount", out var maxCountNode)
            && maxCountNode is JsonValue maxCountValue
            && maxCountValue.GetValueKind() == JsonValueKind.Number
            && maxCountValue.GetValue<decimal>() > 1
        )
        {
            component["type"] = "RepeatingGroup";

            // Convert and warn about filter property if present
            if (
                component.TryGetPropertyValue("edit", out var editNode)
                && editNode is JsonObject editObject
                && editObject.TryGetPropertyValue("filter", out var filterNode)
            )
            {
                editObject.Remove("filter");

                if (!component.ContainsKey("hiddenRow"))
                {
                    // Convert filter to hiddenRow
                    if (filterNode is JsonArray filterArray && filterArray.Count > 0)
                    {
                        var expressions = new List<string>();

                        foreach (var filterItem in filterArray)
                        {
                            if (
                                filterItem is JsonObject filterObject
                                && filterObject.TryGetPropertyValue("key", out var keyNode)
                                && filterObject.TryGetPropertyValue("value", out var valueNode)
                                && keyNode is JsonValue keyValue
                                && keyValue.GetValueKind() == JsonValueKind.String
                                && valueNode is JsonValue valueValue
                                && valueValue.GetValueKind() == JsonValueKind.String
                                && keyValue.GetValue<string>() is var key
                                && valueValue.GetValue<string>() is var value
                            )
                            {
                                expressions.Add(@$"[""notEquals"", [""dataModel"", ""{key}""], ""{value}""]");
                            }
                        }

                        if (expressions.Count == 1)
                        {
                            component["hiddenRow"] = JsonNode.Parse(expressions[0]);
                        }
                        else if (expressions.Count > 1)
                        {
                            component["hiddenRow"] = JsonNode.Parse(@$"[""or"", {string.Join(", ", expressions)}]");
                        }

                        if (expressions.Count == filterArray.Count)
                        {
                            warnings.Add(
                                "filter property has been migrated to hiddenRow property, please verify that the component is still working as intended"
                            );
                        }
                        else if (expressions.Count > 0)
                        {
                            warnings.Add(
                                "filter property was partially migrated to hiddenRow property, please verify that the component is still working as intended"
                            );
                        }
                        else
                        {
                            warnings.Add(
                                "filter property could not be migrated to hiddenRow property, something went wrong"
                            );
                        }
                    }
                }
                else
                {
                    warnings.Add(
                        "filter property could not be migrated to hiddenRow property, because the component already has a hiddenRow property"
                    );
                }
            }

            return new ReplaceResult() { Component = component, Warnings = warnings };
        }

        return new SkipResult();
    }
}
