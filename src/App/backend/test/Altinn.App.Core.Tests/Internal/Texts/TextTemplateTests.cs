using System.Collections.Immutable;
using Altinn.App.Core.Internal.Texts;

namespace Altinn.App.Core.Tests.Internal.Texts;

public class TextTemplateTests
{
    private static readonly TextVariableSource _count = new TextVariableSource.CustomTextParameter("count");
    private static readonly TextVariableSource _name = new TextVariableSource.CustomTextParameter("name");

    private readonly TextTemplate _template = new(["", " of ", " in English"], [_count, _name]);

    [Fact]
    public void Apply_JoinsTheSegmentsWithTheValues()
    {
        Assert.Equal("2 of file in English", _template.Apply(["2", "file"]));
    }

    [Fact]
    public void Apply_DoesNotReplaceInsideAValue()
    {
        Assert.Equal("{name} of file in English", _template.Apply(["{name}", "file"]));
    }

    [Fact]
    public void Apply_ThrowsOnWrongNumberOfValues()
    {
        Assert.Throws<ArgumentException>(() => _template.Apply(["2"]));
    }

    [Fact]
    public void Apply_KeepsTextWithoutVariables()
    {
        var template = new TextTemplate(["No placeholders here"], []);

        Assert.Equal("No placeholders here", template.Apply([]));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(3)]
    public void Constructor_ThrowsWithoutOneMoreSegmentThanVariables(int segmentCount)
    {
        var segments = Enumerable.Repeat("", segmentCount).ToImmutableArray();

        Assert.Throws<ArgumentException>(() => new TextTemplate(segments, [_count]));
    }
}
