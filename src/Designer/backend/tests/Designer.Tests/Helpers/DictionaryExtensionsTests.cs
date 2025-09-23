#nullable enable
using System.Collections.Generic;
using Altinn.Studio.Designer.Helpers.Extensions;
using Xunit;

namespace Designer.Tests.Helpers;

public class DictionaryExtensionsTests
{
    [Fact]
    public void IfBothNull_ReturnTrue()
    {
        // Arrange
        Dictionary<string, string>? first = null;
        Dictionary<string, string>? second = null;

        // Act
        bool result = first.IsEqualTo(second);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IfOneNull_ReturnFalse()
    {
        // Arrange
        Dictionary<string, string> first = [];
        Dictionary<string, string>? second = null;

        // Act
        bool result = first.IsEqualTo(second);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IfSameReference_ReturnTrue()
    {
        // Arrange
        Dictionary<string, string> first = new() { { "key", "value" } };
        Dictionary<string, string> second = first;

        // Act
        bool result = first.IsEqualTo(second);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IfCountNotEqual_ReturnFalse()
    {
        // Arrange
        Dictionary<string, string> first = new() { { "key", "value" } };
        Dictionary<string, string> second = new() { { "key", "value" }, { "key2", "value2" } };

        // Act
        bool result = first.IsEqualTo(second);

        // Assert
        Assert.False(result);
    }

    [Theory]
    [InlineData("sameKey", "value", "sameKey", "differentValue")]
    [InlineData("key", "sameValue", "differentKey", "sameValue")]
    [InlineData("key", "value", "differentKey", "differentValue")]
    public void IfKeyValuePairsNotEqual_ReturnFalse(string key1, string value1, string key2, string value2)
    {
        // Arrange
        Dictionary<string, string> first = new() { { key1, value1 } };
        Dictionary<string, string> second = new() { { key2, value2 } };

        // Act
        bool result = first.IsEqualTo(second);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsEqualTo_ReturnTrue()
    {
        // Arrange
        Dictionary<string, string> first = new() { { "a", "1" }, { "b", "2" } };
        Dictionary<string, string> second = new() { { "b", "2" }, { "a", "1" } };

        // Act
        bool result = first.IsEqualTo(second);

        // Assert
        Assert.True(result);
    }
}
