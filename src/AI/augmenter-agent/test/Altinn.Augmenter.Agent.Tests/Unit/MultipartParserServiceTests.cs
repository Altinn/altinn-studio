using Altinn.Augmenter.Agent.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http;

namespace Altinn.Augmenter.Agent.Tests.Unit;

public class MultipartParserServiceTests
{
    private readonly MultipartParserService _sut = new();

    [Fact]
    public async Task ParseAsync_WithValidFile_ExtractsFile()
    {
        var request = CreateRequest(
            files: [("file", "test.pdf", "application/pdf", "fake-pdf-content"u8.ToArray())]);

        var result = await _sut.ParseAsync(request);

        result.Files.Should().HaveCount(1);
        result.Files[0].Name.Should().Be("test.pdf");
        result.Files[0].ContentType.Should().Be("application/pdf");
        result.CallbackUrl.Should().BeNull();
    }

    [Fact]
    public async Task ParseAsync_WithCallbackUrl_ExtractsUrl()
    {
        var request = CreateRequest(
            files: [("file", "test.json", "application/json", "{}"u8.ToArray())],
            callbackUrl: "https://example.com/callback");

        var result = await _sut.ParseAsync(request);

        result.CallbackUrl.Should().Be("https://example.com/callback");
    }

    [Fact]
    public async Task ParseAsync_WithInvalidContentType_Throws()
    {
        var request = CreateRequest(
            files: [("file", "test.txt", "text/plain", "hello"u8.ToArray())]);

        var act = () => _sut.ParseAsync(request);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*text/plain*not allowed*");
    }

    [Fact]
    public async Task ParseAsync_WithMultipleValidFiles_ExtractsAll()
    {
        var request = CreateRequest(
            files:
            [
                ("file1", "a.pdf", "application/pdf", "pdf"u8.ToArray()),
                ("file2", "b.xml", "application/xml", "<x/>"u8.ToArray()),
                ("file3", "c.json", "application/json", "{}"u8.ToArray()),
            ]);

        var result = await _sut.ParseAsync(request);

        result.Files.Should().HaveCount(3);
    }

    private static HttpRequest CreateRequest(
        (string fieldName, string fileName, string contentType, byte[] data)[] files,
        string? callbackUrl = null)
    {
        var context = new DefaultHttpContext();
        var formFiles = new FormFileCollection();

        foreach (var (fieldName, fileName, contentType, data) in files)
        {
            var stream = new MemoryStream(data);
            formFiles.Add(new FormFile(stream, 0, data.Length, fieldName, fileName)
            {
                Headers = new HeaderDictionary(),
                ContentType = contentType,
            });
        }

        var formFields = new Dictionary<string, Microsoft.Extensions.Primitives.StringValues>();
        if (callbackUrl != null)
        {
            formFields["callback-url"] = callbackUrl;
        }

        context.Request.Form = new FormCollection(formFields, formFiles);
        return context.Request;
    }
}
