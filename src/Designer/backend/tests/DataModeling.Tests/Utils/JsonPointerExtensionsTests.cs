using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Xunit;

namespace DataModeling.Tests.Utils;

public class JsonPointerExtensionsTests
{
    [Theory]
    [InlineData("#", "#")]
    [InlineData("/properties/first name", "#/properties/first%20name")]
    [InlineData("/a~1b", "#/a~1b")]
    [InlineData("/a~0b", "#/a~0b")]
    [InlineData("/a+b", "#/a%2Bb")]
    [InlineData("/a%b", "#/a%25b")]
    [InlineData("/a?b", "#/a%3Fb")]
    [InlineData("/a#b", "#/a%23b")]
    [InlineData("/æøå", "#/%C3%A6%C3%B8%C3%A5")]
    public void ToUriEncodedString_ShouldEncodeFragmentAndRoundTrip(string value, string expected)
    {
        JsonPointer pointer = JsonPointer.Parse(value);

        string actual = pointer.ToUriEncodedString();

        Assert.Equal(expected, actual);
        Assert.Equal(pointer, JsonPointer.Parse(actual));
    }
}
