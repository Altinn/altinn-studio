using System.Globalization;
using WorkflowEngine.Api.Extensions;

namespace WorkflowEngine.Api.Tests.Extensions;

public class StringExtensionsTests
{
    // === FormatWith Tests ===

    [Fact]
    public void FormatWith_ReplacesPlaceholdersWithPropertyValues()
    {
        // Arrange
        const string template = "Hello {Name}, you are {Age} years old.";

        // Act
        var result = template.FormatWith(new { Name = "Alice", Age = 30 }, CultureInfo.InvariantCulture);

        // Assert
        Assert.Equal("Hello Alice, you are 30 years old.", result);
    }

    [Fact]
    public void FormatWith_IsCaseInsensitive()
    {
        // Arrange
        const string template = "{name} and {NAME} and {Name}";

        // Act
        var result = template.FormatWith(new { Name = "Test" }, CultureInfo.InvariantCulture);

        // Assert
        Assert.Equal("Test and Test and Test", result);
    }

    [Fact]
    public void FormatWith_NullPropertyValue_ReturnsEmptyString()
    {
        // Arrange
        const string template = "Value: {Value}";

        // Act
        var result = template.FormatWith(new { Value = (string?)null }, CultureInfo.InvariantCulture);

        // Assert
        Assert.Equal("Value: ", result);
    }

    [Fact]
    public void FormatWith_MissingPlaceholder_ThrowsInvalidOperationException()
    {
        // Arrange
        const string template = "Hello {Missing}";

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() =>
            template.FormatWith(new { Name = "Alice" }, CultureInfo.InvariantCulture)
        );
    }

    [Fact]
    public void FormatWith_NoPlaceholders_ReturnsOriginalString()
    {
        // Arrange
        const string template = "No placeholders here";

        // Act
        var result = template.FormatWith(new { Unused = "value" }, CultureInfo.InvariantCulture);

        // Assert
        Assert.Equal("No placeholders here", result);
    }

    [Fact]
    public void FormatWith_WithFormatProvider_UsesProviderForFormatting()
    {
        // Arrange
        const string template = "Price: {Price}";
        var provider = CultureInfo.GetCultureInfo("de-DE");

        // Act
        var result = template.FormatWith(new { Price = 1234.56 }, provider);

        // Assert — German culture uses comma as decimal separator
        Assert.Contains(",", result, StringComparison.Ordinal);
        Assert.Equal("Price: 1234,56", result);
    }

    [Fact]
    public void FormatWith_MultiplePlaceholders_ReplacesAll()
    {
        // Arrange
        const string template = "https://example.com/{Org}/{App}/api";

        // Act
        var result = template.FormatWith(new { Org = "ttd", App = "my-app" }, CultureInfo.InvariantCulture);

        // Assert
        Assert.Equal("https://example.com/ttd/my-app/api", result);
    }

    // === ToUri Tests ===

    [Fact]
    public void ToUri_AbsoluteUrl_ReturnsAbsoluteUri()
    {
        // Arrange
        const string url = "https://example.com/path";

        // Act
        var uri = url.ToUri();

        // Assert
        Assert.True(uri.IsAbsoluteUri);
        Assert.Equal("https://example.com/path", uri.ToString());
    }

    [Fact]
    public void ToUri_WithExplicitUriKind_UsesSpecifiedKind()
    {
        // Arrange
        const string url = "/relative/path";

        // Act
        var uri = url.ToUri(UriKind.Relative);

        // Assert
        Assert.False(uri.IsAbsoluteUri);
    }
}
