using Altinn.App.Core.Internal.Texts;

namespace Altinn.App.Core.Tests.Internal.Texts;

public class TextTemplateParserTests
{
    private static readonly TextVariableSource _a = new TextVariableSource.CustomTextParameter("a");
    private static readonly TextVariableSource _b = new TextVariableSource.CustomTextParameter("b");

    private static TextVariableSource? VariableFor(string name) =>
        name switch
        {
            "a" => _a,
            "b" => _b,
            _ => null,
        };

    [Fact]
    public void Parse_SplitsAtEachPlaceholder()
    {
        var template = TextTemplateParser.Parse("{a} and {b}.", VariableFor);

        Assert.Equal(["", " and ", "."], template.Segments.ToArray());
        Assert.Equal([_a, _b], template.Variables.ToArray());
    }

    [Fact]
    public void Parse_RepeatsTheVariableOfARepeatedPlaceholder()
    {
        var template = TextTemplateParser.Parse("{a}, {b}, {a}", VariableFor);

        Assert.Equal([_a, _b, _a], template.Variables.ToArray());
        Assert.Equal("1, 2, 1", template.Apply(["1", "2", "1"]));
    }

    [Fact]
    public void Parse_KeepsAnUnknownPlaceholderAsText()
    {
        var template = TextTemplateParser.Parse("{a} {unknown} {b}", VariableFor);

        Assert.Equal(["", " {unknown} ", ""], template.Segments.ToArray());
        Assert.Equal([_a, _b], template.Variables.ToArray());
    }

    [Theory]
    [InlineData("")]
    [InlineData("No placeholders here")]
    [InlineData("Braces { } and {} stay")]
    public void Parse_GivesOneSegmentForTextWithoutPlaceholders(string text)
    {
        var template = TextTemplateParser.Parse(text, VariableFor);

        Assert.Equal([text], template.Segments.ToArray());
        Assert.Empty(template.Variables);
    }
}
