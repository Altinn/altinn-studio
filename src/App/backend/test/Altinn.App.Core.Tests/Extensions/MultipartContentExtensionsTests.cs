using System.Net.Http.Headers;
using Altinn.App.Core.Extensions;

namespace Altinn.App.Core.Tests.Extensions;

public class MultipartContentExtensionsTests
{
    [Fact]
    public void RemoveByName_WithExistingItem_ReturnsTrue()
    {
        // Arrange
        var multipartContent = new MultipartFormDataContent
        {
            { new StringContent("value1"), "field1" },
            { new StringContent("value2"), "field2" },
            { new StringContent("value3"), "field3" },
        };

        // Act
        bool result = multipartContent.RemoveByName("field2");

        // Assert
        Assert.True(result);
        Assert.Equal(2, multipartContent.Count());

        var remainingFields = multipartContent.Select(c => c.Headers.ContentDisposition?.Name?.Trim('"')).ToList();

        Assert.Contains("field1", remainingFields);
        Assert.DoesNotContain("field2", remainingFields);
        Assert.Contains("field3", remainingFields);
    }

    [Fact]
    public void RemoveByName_WithNonExistentItem_ReturnsFalse()
    {
        // Arrange
        var multipartContent = new MultipartFormDataContent
        {
            { new StringContent("value1"), "field1" },
            { new StringContent("value2"), "field2" },
        };

        // Act
        bool result = multipartContent.RemoveByName("nonexistent");

        // Assert
        Assert.False(result);
        Assert.Equal(2, multipartContent.Count());
    }

    [Fact]
    public void RemoveByName_WithEmptyContent_ReturnsFalse()
    {
        // Arrange
        var multipartContent = new MultipartFormDataContent();

        // Act
        bool result = multipartContent.RemoveByName("field1");

        // Assert
        Assert.False(result);
        Assert.Empty(multipartContent);
    }

    [Fact]
    public void RemoveByName_WithNullContent_ThrowsArgumentNullException()
    {
        // Arrange
        MultipartContent nullContent = null!;

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => nullContent.RemoveByName("field1"));
    }

    [Fact]
    public void RemoveByName_WithNullName_ThrowsArgumentNullException()
    {
        // Arrange
        var multipartContent = new MultipartFormDataContent();

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => multipartContent.RemoveByName(null!));
    }

    [Fact]
    public void RemoveByName_WithEmptyName_ThrowsArgumentException()
    {
        // Arrange
        var multipartContent = new MultipartFormDataContent();

        // Act & Assert
        Assert.Throws<ArgumentException>(() => multipartContent.RemoveByName(""));
    }

    [Fact]
    public void RemoveByName_WithWhitespaceName_ThrowsArgumentException()
    {
        // Arrange
        var multipartContent = new MultipartFormDataContent();

        // Act & Assert
        Assert.Throws<ArgumentException>(() => multipartContent.RemoveByName("   "));
    }

    [Fact]
    public void RemoveByName_WithQuotedName_RemovesCorrectItem()
    {
        // Arrange
        var multipartContent = new MultipartContent();
        var content = new StringContent("value1");
        content.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data") { Name = "\"field1\"" };
        multipartContent.Add(content);

        // Act
        bool result = multipartContent.RemoveByName("field1");

        // Assert
        Assert.True(result);
        Assert.Empty(multipartContent);
    }

    [Fact]
    public void ReplaceByName_WithExistingItem_ReplacesContent()
    {
        // Arrange
        var multipartContent = new MultipartFormDataContent
        {
            { new StringContent("original"), "field1" },
            { new StringContent("value2"), "field2" },
        };

        var newContent = new StringContent("replaced");

        // Act
        multipartContent.ReplaceByName(newContent, "field1");

        // Assert
        Assert.Equal(2, multipartContent.Count());

        var field1Content = multipartContent.FirstOrDefault(c =>
            c.Headers.ContentDisposition?.Name?.Trim('"') == "field1"
        );

        Assert.NotNull(field1Content);
        Assert.Same(newContent, field1Content);
    }

    [Fact]
    public void ReplaceByName_WithNonExistentItem_AddsNewContent()
    {
        // Arrange
        var multipartContent = new MultipartFormDataContent { { new StringContent("value1"), "field1" } };

        var newContent = new StringContent("new");

        // Act
        multipartContent.ReplaceByName(newContent, "field2");

        // Assert
        Assert.Equal(2, multipartContent.Count());

        var field2Content = multipartContent.FirstOrDefault(c =>
            c.Headers.ContentDisposition?.Name?.Trim('"') == "field2"
        );

        Assert.NotNull(field2Content);
        Assert.Same(newContent, field2Content);
    }

    [Fact]
    public void ReplaceByName_WithGenericMultipartContent_SetsContentDisposition()
    {
        // Arrange
        var multipartContent = new MultipartContent();
        var newContent = new StringContent("test");

        // Act
        multipartContent.ReplaceByName(newContent, "field1");

        // Assert
        Assert.Single(multipartContent);
        Assert.NotNull(newContent.Headers.ContentDisposition);
        Assert.Equal("form-data", newContent.Headers.ContentDisposition.DispositionType);
        Assert.Equal("field1", newContent.Headers.ContentDisposition.Name);
    }

    [Fact]
    public void ReplaceByName_WithNullContent_ThrowsArgumentNullException()
    {
        // Arrange
        MultipartContent nullContent = null!;

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => nullContent.ReplaceByName(new StringContent("test"), "field1"));
    }

    [Fact]
    public void ReplaceByName_WithNullNewContent_ThrowsArgumentNullException()
    {
        // Arrange
        var multipartContent = new MultipartFormDataContent();

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => multipartContent.ReplaceByName(null!, "field1"));
    }

    [Fact]
    public void ReplaceByName_WithNullName_ThrowsArgumentNullException()
    {
        // Arrange
        var multipartContent = new MultipartFormDataContent();

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => multipartContent.ReplaceByName(new StringContent("test"), null!));
    }

    [Fact]
    public void ReplaceByName_WithEmptyName_ThrowsArgumentException()
    {
        // Arrange
        var multipartContent = new MultipartFormDataContent();

        // Act & Assert
        Assert.Throws<ArgumentException>(() => multipartContent.ReplaceByName(new StringContent("test"), ""));
    }

    [Fact]
    public void ReplaceByName_PreservesExistingContentDisposition()
    {
        // Arrange
        var multipartContent = new MultipartFormDataContent();
        var newContent = new StringContent("test");
        newContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
        {
            FileName = "test.txt",
        };

        // Act
        multipartContent.ReplaceByName(newContent, "field1");

        // Assert
        Assert.Equal("field1", newContent.Headers.ContentDisposition.Name);
        Assert.Equal("test.txt", newContent.Headers.ContentDisposition.FileName);
        Assert.Equal("attachment", newContent.Headers.ContentDisposition.DispositionType);
    }

    [Fact]
    public void RemoveByName_RemovesFirstMatchingItem()
    {
        // Arrange
        var multipartContent = new MultipartContent();

        var content1 = new StringContent("first");
        content1.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data") { Name = "duplicate" };

        var content2 = new StringContent("second");
        content2.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data") { Name = "duplicate" };

        multipartContent.Add(content1);
        multipartContent.Add(content2);

        // Act
        bool result = multipartContent.RemoveByName("duplicate");

        // Assert
        Assert.True(result);
        Assert.Single(multipartContent);

        // Verify the second item remains
        var remaining = multipartContent.First();
        Assert.Same(content2, remaining);
    }

    [Fact]
    public void ReplaceByName_WithMultipleMatches_RemovesOnlyFirst()
    {
        // Arrange
        var multipartContent = new MultipartContent();

        var content1 = new StringContent("first");
        content1.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data") { Name = "duplicate" };

        var content2 = new StringContent("second");
        content2.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data") { Name = "duplicate" };

        multipartContent.Add(content1);
        multipartContent.Add(content2);

        var newContent = new StringContent("replacement");

        // Act
        multipartContent.ReplaceByName(newContent, "duplicate");

        // Assert
        Assert.Equal(2, multipartContent.Count());

        var items = multipartContent.ToList();
        Assert.Same(content2, items[0]); // Second original item remains
        Assert.Same(newContent, items[1]); // New content is added
    }

    [Fact]
    public void RemoveByName_WithGenericMultipartContent_WorksCorrectly()
    {
        // Arrange
        var multipartContent = new MultipartContent();
        var content = new StringContent("test");
        content.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data") { Name = "field1" };
        multipartContent.Add(content);

        // Act
        bool result = multipartContent.RemoveByName("field1");

        // Assert
        Assert.True(result);
        Assert.Empty(multipartContent);
    }
}
