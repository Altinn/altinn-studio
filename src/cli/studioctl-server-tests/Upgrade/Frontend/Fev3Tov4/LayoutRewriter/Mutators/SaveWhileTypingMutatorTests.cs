using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

namespace Studioctl.Tests.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

public sealed class SaveWhileTypingMutatorTests
{
    [Fact]
    public void RemovesTrue()
    {
        var result = Mutate(
            new JsonObject
            {
                ["id"] = "c",
                ["type"] = "Input",
                ["saveWhileTyping"] = true,
            }
        );

        Assert.False(result.Component.ContainsKey("saveWhileTyping"));
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void ReplacesFalseWithLongTimeoutAndWarns()
    {
        var result = Mutate(
            new JsonObject
            {
                ["id"] = "c",
                ["type"] = "Input",
                ["saveWhileTyping"] = false,
            }
        );

        Assert.Equal(4000, result.Component["saveWhileTyping"]?.GetValue<int>());
        Assert.Single(result.Warnings);
    }

    private static ReplaceResult Mutate(JsonObject component) =>
        Assert.IsType<ReplaceResult>(new SaveWhileTypingMutator().Mutate(component, []));
}
