using System.Text.Json;
using System.Text.Json.Nodes;

namespace altinn_app_cli.fev3tov4.LayoutRewriter;

/// <summary>
/// Rename AddressComponent -> Address
/// </summary>
class AddressMutator : ILayoutMutator
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

        if (type == "AddressComponent")
        {
            component["type"] = "Address";
            return new ReplaceResult() { Component = component };
        }

        return new SkipResult();
    }
}
