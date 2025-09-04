using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter;

internal interface IMutationResult { }

internal sealed class SkipResult : IMutationResult { }

internal sealed class DeleteResult : IMutationResult
{
    public List<string> Warnings { get; set; } = new List<string>();
}

internal sealed class ErrorResult : IMutationResult
{
    public required string Message { get; set; }
}

internal sealed class ReplaceResult : IMutationResult
{
    public required JsonObject Component { get; set; }
    public List<string> Warnings { get; set; } = new List<string>();
}

/**
 * Note: The Mutate function receives a clone of the component and can be modified directly, and then returned in ReplaceResult.
 */

internal interface ILayoutMutator
{
    IMutationResult Mutate(JsonObject component, Dictionary<string, JsonObject> componentLookup);
}
