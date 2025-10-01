using Altinn.App.Core.Features.Correspondence.Builder;
using Altinn.App.Core.Features.Correspondence.Exceptions;

namespace Altinn.App.Core.Tests.Features.Correspondence.Builder;

public sealed class BuilderUtilsTests
{
    [Fact]
    public void NotNullOrEmpty_WithValidString_DoesNotThrow()
    {
        // Arrange
        var validString = "test value";

        // Act & Assert
        var exception = Record.Exception(() => BuilderUtils.NotNullOrEmpty(validString));
        Assert.Null(exception);
    }

    [Fact]
    public void NotNullOrEmpty_WithValidObject_DoesNotThrow()
    {
        // Arrange
        var validObject = new object();

        // Act & Assert
        var exception = Record.Exception(() => BuilderUtils.NotNullOrEmpty(validObject));
        Assert.Null(exception);
    }

    [Fact]
    public void NotNullOrEmpty_WithValidDateTimeOffset_DoesNotThrow()
    {
        // Arrange
        var validDateTime = DateTimeOffset.Now;

        // Act & Assert
        var exception = Record.Exception(() => BuilderUtils.NotNullOrEmpty(validDateTime));
        Assert.Null(exception);
    }

    [Fact]
    public void NotNullOrEmpty_WithValidReadOnlyMemory_DoesNotThrow()
    {
        // Arrange
        var validMemory = new ReadOnlyMemory<byte>([1, 2, 3]);

        // Act & Assert
        var exception = Record.Exception(() => BuilderUtils.NotNullOrEmpty(validMemory));
        Assert.Null(exception);
    }

    [Fact]
    public void NotNullOrEmpty_WithNullValue_ThrowsCorrespondenceArgumentException()
    {
        // Arrange
        object? nullValue = null;

        // Act & Assert
        Assert.Throws<CorrespondenceArgumentException>(() => BuilderUtils.NotNullOrEmpty(nullValue));
    }

    [Fact]
    public void NotNullOrEmpty_WithEmptyString_ThrowsCorrespondenceArgumentException()
    {
        // Arrange
        var emptyString = "";

        // Act & Assert
        Assert.Throws<CorrespondenceArgumentException>(() => BuilderUtils.NotNullOrEmpty(emptyString));
    }

    [Fact]
    public void NotNullOrEmpty_WithWhitespaceString_ThrowsCorrespondenceArgumentException()
    {
        // Arrange
        var whitespaceString = "   ";

        // Act & Assert
        Assert.Throws<CorrespondenceArgumentException>(() => BuilderUtils.NotNullOrEmpty(whitespaceString));
    }

    [Fact]
    public void NotNullOrEmpty_WithEmptyReadOnlyMemory_ThrowsCorrespondenceArgumentException()
    {
        // Arrange
        var emptyMemory = ReadOnlyMemory<byte>.Empty;

        // Act & Assert
        Assert.Throws<CorrespondenceArgumentException>(() => BuilderUtils.NotNullOrEmpty(emptyMemory));
    }

    [Fact]
    public void NotNullOrEmpty_WithMinValueDateTimeOffset_ThrowsCorrespondenceArgumentException()
    {
        // Arrange
        var minDateTime = DateTimeOffset.MinValue;

        // Act & Assert
        Assert.Throws<CorrespondenceArgumentException>(() => BuilderUtils.NotNullOrEmpty(minDateTime));
    }

    [Fact]
    public void NotNullOrEmpty_WithCustomErrorMessage_ThrowsWithCustomMessage()
    {
        // Arrange
        object? nullValue = null;
        var customMessage = "Custom error message";

        // Act & Assert
        var exception = Assert.Throws<CorrespondenceArgumentException>(() =>
            BuilderUtils.NotNullOrEmpty(nullValue, customMessage)
        );
        Assert.Equal(customMessage, exception.Message);
    }

    [Fact]
    public void RequireAtLeastOneOf_WithBothValuesNull_ThrowsCorrespondenceArgumentException()
    {
        // Arrange
        string? value1 = null;
        string? value2 = null;

        // Act & Assert
        var exception = Assert.Throws<CorrespondenceArgumentException>(() =>
            BuilderUtils.RequireAtLeastOneOf(value1, value2)
        );
        Assert.Equal("At least one of value1 or value2 must be set.", exception.Message);
    }

    [Fact]
    public void RequireAtLeastOneOf_WithFirstValueSet_DoesNotThrow()
    {
        // Arrange
        string? value1 = "test";
        string? value2 = null;

        // Act & Assert
        var exception = Record.Exception(() => BuilderUtils.RequireAtLeastOneOf(value1, value2));
        Assert.Null(exception);
    }

    [Fact]
    public void RequireAtLeastOneOf_WithSecondValueSet_DoesNotThrow()
    {
        // Arrange
        string? value1 = null;
        string? value2 = "test";

        // Act & Assert
        var exception = Record.Exception(() => BuilderUtils.RequireAtLeastOneOf(value1, value2));
        Assert.Null(exception);
    }

    [Fact]
    public void RequireAtLeastOneOf_WithBothValuesSet_DoesNotThrow()
    {
        // Arrange
        string? value1 = "test1";
        string? value2 = "test2";

        // Act & Assert
        var exception = Record.Exception(() => BuilderUtils.RequireAtLeastOneOf(value1, value2));
        Assert.Null(exception);
    }

    [Fact]
    public void RequireAtLeastOneOf_WithCustomErrorMessage_ThrowsWithCustomMessage()
    {
        // Arrange
        string? value1 = null;
        string? value2 = null;
        var customMessage = "Custom error for at least one";

        // Act & Assert
        var exception = Assert.Throws<CorrespondenceArgumentException>(() =>
            BuilderUtils.RequireAtLeastOneOf(value1, value2, customMessage)
        );
        Assert.Equal(customMessage, exception.Message);
    }

    [Fact]
    public void RequireAtLeastOneOf_CapturesArgumentExpressions()
    {
        // Arrange
        string? emailAddress = null;
        string? mobileNumber = null;

        // Act & Assert
        var exception = Assert.Throws<CorrespondenceArgumentException>(() =>
            BuilderUtils.RequireAtLeastOneOf(emailAddress, mobileNumber)
        );
        Assert.Equal("At least one of emailAddress or mobileNumber must be set.", exception.Message);
    }

    [Fact]
    public void RequireExactlyOneOf_WithBothValuesNull_ThrowsCorrespondenceArgumentException()
    {
        // Arrange
        string? value1 = null;
        string? value2 = null;

        // Act & Assert
        var exception = Assert.Throws<CorrespondenceArgumentException>(() =>
            BuilderUtils.RequireExactlyOneOf(value1, value2)
        );
        Assert.Equal("Exactly one of value1 or value2 must be set.", exception.Message);
    }

    [Fact]
    public void RequireExactlyOneOf_WithBothValuesSet_ThrowsCorrespondenceArgumentException()
    {
        // Arrange
        string? value1 = "test1";
        string? value2 = "test2";

        // Act & Assert
        var exception = Assert.Throws<CorrespondenceArgumentException>(() =>
            BuilderUtils.RequireExactlyOneOf(value1, value2)
        );
        Assert.Equal("Exactly one of value1 or value2 must be set.", exception.Message);
    }

    [Fact]
    public void RequireExactlyOneOf_WithFirstValueSet_DoesNotThrow()
    {
        // Arrange
        string? value1 = "test";
        string? value2 = null;

        // Act & Assert
        var exception = Record.Exception(() => BuilderUtils.RequireExactlyOneOf(value1, value2));
        Assert.Null(exception);
    }

    [Fact]
    public void RequireExactlyOneOf_WithSecondValueSet_DoesNotThrow()
    {
        // Arrange
        string? value1 = null;
        string? value2 = "test";

        // Act & Assert
        var exception = Record.Exception(() => BuilderUtils.RequireExactlyOneOf(value1, value2));
        Assert.Null(exception);
    }

    [Fact]
    public void RequireExactlyOneOf_WithCustomErrorMessage_ThrowsWithCustomMessage()
    {
        // Arrange
        string? value1 = null;
        string? value2 = null;
        var customMessage = "Custom error for exactly one";

        // Act & Assert
        var exception = Assert.Throws<CorrespondenceArgumentException>(() =>
            BuilderUtils.RequireExactlyOneOf(value1, value2, customMessage)
        );
        Assert.Equal(customMessage, exception.Message);
    }

    [Fact]
    public void RequireExactlyOneOf_CapturesArgumentExpressions()
    {
        // Arrange
        var organizationNumber = (string?)null;
        var nationalIdentityNumber = (string?)null;

        // Act & Assert
        var exception = Assert.Throws<CorrespondenceArgumentException>(() =>
            BuilderUtils.RequireExactlyOneOf(organizationNumber, nationalIdentityNumber)
        );
        Assert.Equal("Exactly one of organizationNumber or nationalIdentityNumber must be set.", exception.Message);
    }

    [Fact]
    public void RequireExactlyOneOf_WithDifferentTypes_WorksCorrectly()
    {
        // Arrange
        int? intValue = 42;
        string? stringValue = null;

        // Act & Assert
        var exception = Record.Exception(() => BuilderUtils.RequireExactlyOneOf(intValue, stringValue));
        Assert.Null(exception);
    }

    [Fact]
    public void RequireAtLeastOneOf_WithDifferentTypes_WorksCorrectly()
    {
        // Arrange
        int? intValue = null;
        string? stringValue = "test";

        // Act & Assert
        var exception = Record.Exception(() => BuilderUtils.RequireAtLeastOneOf(intValue, stringValue));
        Assert.Null(exception);
    }
}
