#nullable disable
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Models;

public class LanguageCodeTests
{
    static readonly string[] _validIso6391Codes = ["aa", "Bb", "CC", "zz"];

    static readonly string[] _invalidIso6391Codes = ["a.", " b", "abc", "😎🤓"];

    [Fact]
    public void ValidIso6391Code_ParsesOk()
    {
        foreach (var validCode in _validIso6391Codes)
        {
            var langCode = LanguageCode<Iso6391>.Parse(validCode);
            langCode.Value.Should().Be(validCode.ToLowerInvariant());
        }
    }

    [Fact]
    public void InvalidIso6391Code_ThrowsException()
    {
        foreach (var invalidCode in _invalidIso6391Codes)
        {
            Action act = () => LanguageCode<Iso6391>.Parse(invalidCode);
            act.Should().Throw<FormatException>();
        }
    }

    [Fact]
    public void Equality_WorksAsExpected()
    {
        var code1 = _validIso6391Codes[0];
        var code2 = _validIso6391Codes[2];
        var langCode1A = LanguageCode<Iso6391>.Parse(code1);
        var langCode1B = LanguageCode<Iso6391>.Parse(code1);
        var langCode2 = LanguageCode<Iso6391>.Parse(code2);

        Assert.True(langCode1A == code1);
        Assert.True(langCode1A != code2);
        Assert.True(code1 == langCode1A);
        Assert.True(code2 != langCode1A);
        Assert.True(langCode1A.Equals(code1));
        Assert.False(langCode1A.Equals(code2));

        Assert.True(langCode1A == langCode1B);
        Assert.True(langCode1A != langCode2);
        Assert.False(langCode1A == langCode2);

        langCode1A.Should().Be(langCode1B);
        langCode1A.Should().NotBe(langCode2);
    }

    [Fact]
    public void ImplicitStringConversion_WorksAsExpected()
    {
        foreach (var validCode in _validIso6391Codes)
        {
            string langCodeString = LanguageCode<Iso6391>.Parse(validCode);
            langCodeString.Should().Be(validCode.ToLowerInvariant());
        }
    }
}
