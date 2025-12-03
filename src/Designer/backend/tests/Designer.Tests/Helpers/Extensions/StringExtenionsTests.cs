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
        string original = "Lorem ipsum";
        string result = original.WithoutPrefix("ipsum");
        Assert.Equal(original, result);
    }

    [Fact]
    public void WithoutLeadingSlash_WhenStringStartsWithSlash_ReturnsWithoutLeadingSlash()
    {
        string result = "/some/path/".WithoutLeadingSlash();
        Assert.Equal("some/path/", result);
    }
}
