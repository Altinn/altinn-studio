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
        var langCode1A = LanguageCode<Iso6391>.Parse(_validIso6391Codes[0]);
        var langCode1B = LanguageCode<Iso6391>.Parse(_validIso6391Codes[0]);
        var langCode2 = LanguageCode<Iso6391>.Parse(_validIso6391Codes[2]);

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
