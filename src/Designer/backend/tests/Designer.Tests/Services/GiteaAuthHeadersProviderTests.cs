using Altinn.Studio.Designer.Services.Implementation;
using Xunit;

namespace Designer.Tests.Services;

public class GiteaAuthHeadersProviderTests
{
    [Theory]
    [InlineData("Hensynsløs Måke", "Hensynsloes Maake")]
    [InlineData("Björk Söderström", "Bjork Soderstrom")]
    [InlineData("Ola Nordmann", "Ola Nordmann")]
    [InlineData("Ærlig Ødansen Åsheim", "AErlig OEdansen AAsheim")]
    [InlineData("José García", "Jose Garcia")]
    [InlineData("François Müller", "Francois Muller")]
    [InlineData("", "")]
    [InlineData("ASCII only 123", "ASCII only 123")]
    public void ToAscii_ConvertsCorrectly(string input, string expected)
    {
        string result = GiteaAuthHeadersProvider.ToAscii(input);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void ToAscii_ResultContainsOnlyAsciiCharacters()
    {
        string input = "Hensynsløs Måke Björk Söderström José García æøåÆØÅ";
        string result = GiteaAuthHeadersProvider.ToAscii(input);

        foreach (char c in result)
        {
            Assert.True(c <= 127, $"Non-ASCII character found: '{c}' (U+{(int)c:X4})");
        }
    }
}
