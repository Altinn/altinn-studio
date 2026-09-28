using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

namespace Studioctl.Tests.Upgrade.Frontend.Fev3Tov4.LayoutRewriter.Mutators;

public sealed class SaveWhileTypingMutatorTests
{
    private readonly SaveWhileTypingMutator _mutator = new();

    [Fact]
    public void RemovesTrue()
    {
        var result = Mutate("on", "Input", true);

        Assert.False(result.Component.ContainsKey("saveWhileTyping"));
        Assert.Null(_mutator.GetWarning());
    }

    [Fact]
    public void ReplacesFalseWithLongTimeoutAndWarnsOnce()
    {
        var first = Mutate("first", "Input", false);
        Mutate("second", "Address", false);

        Assert.Equal(4000, first.Component["saveWhileTyping"]?.GetValue<int>());
        Assert.Empty(first.Warnings);
        var warning = _mutator.GetWarning();
        Assert.NotNull(warning);
        Assert.Contains("Input first, Address second", warning, StringComparison.Ordinal);
    }

    private ReplaceResult Mutate(string id, string type, bool saveWhileTyping) =>
        Assert.IsType<ReplaceResult>(
            _mutator.Mutate(
                new JsonObject
                {
                    ["id"] = id,
                    ["type"] = type,
                    ["saveWhileTyping"] = saveWhileTyping,
                },
                []
            )
        );
}
