using Altinn.Studio.Designer.Helpers.Extensions;
using Xunit;

namespace Designer.Tests.Helpers.Extensions;

public class StringExtensionsTests
{
    [Fact]
    public void WithoutPrefix_WhenStringStartsWithGivenPrefix_ReturnsWithoutPrefix()
    {
        string original = "Lorem ipsum";
        string result = original.WithoutPrefix("Lorem");
        Assert.Equal(" ipsum", result);
    }

    [Fact]
    public void WithoutPrefix_WhenStringDoesNotStartWithGivenPrefix_ReturnsOriginalString()
    {
        string result = "Lorem ipsum".WithoutPrefix("ipsum");
        Assert.Equal("Lorem ipsum", result);
    }

    [Fact]
    public void WithoutLeadingSlash_WhenStringStartsWithSlash_ReturnsWithoutLeadingSlash()
    {
        string result = "/some/path/".WithoutLeadingSlash();
        Assert.Equal("some/path/", result);
    }

    [Fact]
    public void WithoutLineBreaks_RemovesAllLineBreaks()
    {
        string result = "Line1\r\nLine2\nLine3\rLine4".WithoutLineBreaks();
        Assert.Equal("Line1Line2Line3Line4", result);
    }
}
