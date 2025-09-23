#nullable enable
using Altinn.Studio.Designer.Helpers;
using Xunit;

namespace Designer.Tests.Helpers;

public class InputValidatorTests
{
    [Theory]
    [InlineData("_invalidTitle")]
    [InlineData("-invalidTitle")]
    [InlineData("invalid-title")]
    [InlineData("invalid.title")]
    [InlineData("invalid title")]
    [InlineData("invalid/title")]
    [InlineData("invalid\0title")]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void IsInvalidCodeListTitle_InvalidTitles_ReturnsTrue(string? title)
    {
        // Arrange & Act
        bool result = InputValidator.IsInvalidCodeListTitle(title);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsValidGiteaCommitMessage_InvalidMessages_ReturnsFalse()
    {
        // Arrange
        string nullChar = "\0";
        string tooLongMessage = new('a', 5121);

        // Act & Assert
        Assert.False(InputValidator.IsValidGiteaCommitMessage(nullChar));
        Assert.False(InputValidator.IsValidGiteaCommitMessage(tooLongMessage));
    }
}
