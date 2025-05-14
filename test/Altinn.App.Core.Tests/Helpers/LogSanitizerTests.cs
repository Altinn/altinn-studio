using Altinn.App.Core.Helpers;

namespace Altinn.App.Core.Tests.Helpers;

public class LogSanitizerTests
{
    [Theory]
    [InlineData(null, "")]
    [InlineData("", "")]
    [InlineData("   ", "")]
    [InlineData("NormalText", "NormalText")]
    [InlineData("  NormalText  ", "NormalText")]
    [InlineData("Text\nWith\nNewlines", "TextWithNewlines")]
    [InlineData("Text\rWith\rReturns", "TextWithReturns")]
    [InlineData("Text\tWith\tTabs", "TextWithTabs")]
    [InlineData("\n\nInjected\nLog\nLines\n", "InjectedLogLines")]
    public void Sanitize_RemovesControlCharactersAndTrimsWhitespace(string? input, string expected)
    {
        // Act
        string result = LogSanitizer.Sanitize(input);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Sanitize_TruncatesLongInput()
    {
        // Arrange
        var input = new string('A', 1500);
        string expected = new string('A', 1000) + "... (truncated)";

        // Act
        string result = LogSanitizer.Sanitize(input);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Sanitize_HandlesComplexInjectionAttempt()
    {
        // Arrange
        const string input = "Malicious\nEntry\r\n[ERROR] Fake Log Entry\tInjected 🚨";
        const string expected = "MaliciousEntry[ERROR] Fake Log EntryInjected 🚨";

        // Act
        string result = LogSanitizer.Sanitize(input);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Sanitize_WhitespaceWithControlCharacters_TrimsCorrectly()
    {
        // Arrange
        const string input = " \n Text \n ";
        const string expected = "Text";

        // Act
        string result = LogSanitizer.Sanitize(input);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Sanitize_ExactlyMaxLength_NoTruncation()
    {
        // Arrange
        var input = new string('A', 1000);
        var expected = new string('A', 1000);

        // Act
        string result = LogSanitizer.Sanitize(input);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Sanitize_OneCharacterOverMax_Truncates()
    {
        // Arrange
        var input = new string('A', 1001);
        string expected = new string('A', 1000) + "... (truncated)";

        // Act
        string result = LogSanitizer.Sanitize(input);

        // Assert
        Assert.Equal(expected, result);
    }
}
