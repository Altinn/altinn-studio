#if NET10_0_OR_GREATER
using Altinn.App.Ai.Enrichment.TraceProbe;
using FluentAssertions;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.Telemetry;

/// <summary>
/// The file this reads is assembled by hand from a Langfuse key page, so the cases
/// that matter are the ones that survive a copy-paste: quotes, an <c>export</c>
/// prefix picked up from shell instructions, and comments.
/// </summary>
public class DotEnvTests
{
    [Fact]
    public void Parse_ReadsPlainAssignments()
    {
        var values = DotEnv.Parse([
            "LANGFUSE_BASE_URL=https://langfuse.digdir.cloud",
            "LANGFUSE_PUBLIC_KEY=pk-lf-1234",
        ]);

        values["LANGFUSE_BASE_URL"].Should().Be("https://langfuse.digdir.cloud");
        values["LANGFUSE_PUBLIC_KEY"].Should().Be("pk-lf-1234");
    }

    [Theory]
    [InlineData("KEY=\"quoted\"", "quoted")]
    [InlineData("KEY='quoted'", "quoted")]
    [InlineData("export KEY=exported", "exported")]
    [InlineData("  KEY = spaced  ", "spaced")]
    public void Parse_AcceptsTheShapesPeoplePasteIn(string line, string expected)
    {
        DotEnv.Parse([line])["KEY"].Should().Be(expected);
    }

    [Fact]
    public void Parse_SkipsBlanksAndComments()
    {
        var values = DotEnv.Parse(["", "   ", "# a comment", "KEY=value"]);

        values.Should().ContainSingle();
        values["KEY"].Should().Be("value");
    }

    [Fact]
    public void Parse_SplitsOnTheFirstEqualsOnly()
    {
        // Base64-ish secrets carry '=' padding; splitting on every one truncates them.
        DotEnv.Parse(["KEY=abc=def=="]) ["KEY"].Should().Be("abc=def==");
    }

    [Fact]
    public void Parse_IgnoresLinesThatAreNotAssignments()
    {
        DotEnv.Parse(["not an assignment", "=novalue"]).Should().BeEmpty();
    }
}
#endif
