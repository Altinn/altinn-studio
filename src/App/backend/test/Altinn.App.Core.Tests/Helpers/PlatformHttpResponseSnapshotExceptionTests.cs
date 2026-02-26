using System.Net;
using System.Text;
using Altinn.App.Core.Helpers;

namespace Altinn.App.Core.Tests.Helpers;

public class PlatformHttpResponseSnapshotExceptionTests
{
    [Fact]
    public async Task CreateAndDisposeHttpResponse_CapturesBasicProperties()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.InternalServerError)
        {
            ReasonPhrase = "Internal Server Error",
            Version = new Version(2, 0),
            Content = new StringContent("Error details", Encoding.UTF8, "text/plain"),
        };

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.Equal(500, exception.StatusCode);
        Assert.Equal("Internal Server Error", exception.ReasonPhrase);
        Assert.Equal("2.0", exception.HttpVersion);
        Assert.Equal("Error details", exception.Content);
        Assert.False(exception.ContentTruncated);
        Assert.Contains("500", exception.Message);
        Assert.Contains("Internal Server Error", exception.Message);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_HandlesNullContent()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.NoContent) { Content = null };

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.Empty(exception.Content);
        Assert.False(exception.ContentTruncated);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_HandlesEmptyContent()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(string.Empty, Encoding.UTF8, "text/plain"),
        };

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.Empty(exception.Content);
        Assert.False(exception.ContentTruncated);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_TruncatesLargeContent()
    {
        // Arrange
        string largeContent = new string('x', 20 * 1024); // 20 KB
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(largeContent, Encoding.UTF8, "text/plain"),
        };

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.True(exception.ContentTruncated);
        Assert.Equal(16 * 1024, exception.Content.Length); // Max is 16 KB
        Assert.Contains("[truncated]", exception.Message);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_DoesNotTruncateSmallContent()
    {
        // Arrange
        string content = new string('x', 10 * 1024); // 10 KB (under limit)
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(content, Encoding.UTF8, "text/plain"),
        };

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.False(exception.ContentTruncated);
        Assert.Equal(10 * 1024, exception.Content.Length);
        Assert.DoesNotContain("[truncated]", exception.Message);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_RedactsSensitiveHeaders()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.Unauthorized)
        {
            Content = new StringContent("Unauthorized", Encoding.UTF8, "text/plain"),
        };

        response.Headers.TryAddWithoutValidation("Authorization", "Bearer secret-token-12345");
        response.Headers.TryAddWithoutValidation("Cookie", "session=abc123; user=john");
        response.Headers.TryAddWithoutValidation("Set-Cookie", "session=newvalue; Secure; HttpOnly");
        response.Headers.TryAddWithoutValidation("Proxy-Authorization", "Basic encoded-credentials");

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.Contains("Authorization: [REDACTED]", exception.Headers);
        Assert.Contains("Cookie: [REDACTED]", exception.Headers);
        Assert.Contains("Set-Cookie: [REDACTED]", exception.Headers);
        Assert.Contains("Proxy-Authorization: [REDACTED]", exception.Headers);

        Assert.DoesNotContain("secret-token-12345", exception.Headers);
        Assert.DoesNotContain("session=abc123", exception.Headers);
        Assert.DoesNotContain("session=newvalue", exception.Headers);
        Assert.DoesNotContain("encoded-credentials", exception.Headers);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_RedactsHeaders_CaseInsensitive()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.Forbidden)
        {
            Content = new StringContent("Forbidden", Encoding.UTF8, "text/plain"),
        };

        response.Headers.TryAddWithoutValidation("authorization", "Bearer lowercase-token");
        response.Headers.TryAddWithoutValidation("COOKIE", "session=uppercase");
        response.Headers.TryAddWithoutValidation("sEt-CoOkIe", "session=mixedcase");
        response.Headers.TryAddWithoutValidation("PROXY-AUTHORIZATION", "Basic proxy-creds");

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert - HttpHeaders normalizes header names, so we just check that values are redacted
        Assert.Contains("[REDACTED]", exception.Headers);
        Assert.DoesNotContain("lowercase-token", exception.Headers);
        Assert.DoesNotContain("session=uppercase", exception.Headers);
        Assert.DoesNotContain("session=mixedcase", exception.Headers);
        Assert.DoesNotContain("proxy-creds", exception.Headers);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_PreservesNonSensitiveHeaders()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("Success", Encoding.UTF8, "application/json"),
        };

        response.Headers.TryAddWithoutValidation("X-Correlation-Id", "correlation-123");
        response.Headers.TryAddWithoutValidation("X-Rate-Limit", "100");
        response.Headers.TryAddWithoutValidation("Cache-Control", "no-cache");

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.Contains("X-Correlation-Id: correlation-123", exception.Headers);
        Assert.Contains("X-Rate-Limit: 100", exception.Headers);
        Assert.Contains("Cache-Control: no-cache", exception.Headers);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_CapturesContentHeaders()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("Test content", Encoding.UTF8, "application/json"),
        };
        response.Content.Headers.Add("X-Custom-Content-Header", "content-value");

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.Contains("Content-Headers:", exception.Headers);
        Assert.Contains("X-Custom-Content-Header: content-value", exception.Headers);
        Assert.Contains("Content-Type: application/json; charset=utf-8", exception.Headers);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_CapturesTrailingHeaders()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("Test", Encoding.UTF8, "text/plain"),
            Version = new Version(2, 0),
        };
        response.TrailingHeaders.TryAddWithoutValidation("X-Trailing-Header", "trailing-value");

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.Contains("Trailing-Headers:", exception.Headers);
        Assert.Contains("X-Trailing-Header: trailing-value", exception.Headers);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_RedactsSensitiveTrailingHeaders()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("Test", Encoding.UTF8, "text/plain"),
            Version = new Version(2, 0),
        };
        response.TrailingHeaders.TryAddWithoutValidation("Set-Cookie", "trailing-session=secret");

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.Contains("Trailing-Headers:", exception.Headers);
        Assert.Contains("Set-Cookie: [REDACTED]", exception.Headers);
        Assert.DoesNotContain("trailing-session=secret", exception.Headers);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_DisposesOriginalResponse()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("Test", Encoding.UTF8, "text/plain"),
        };

        // Act
        await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert - accessing disposed response should throw
        await Assert.ThrowsAsync<ObjectDisposedException>(async () => await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_InheritsFromPlatformHttpException()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent("Bad request", Encoding.UTF8, "text/plain"),
        };

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.IsAssignableFrom<PlatformHttpException>(exception);
        Assert.NotNull(exception.Response);
        Assert.Equal(HttpStatusCode.BadRequest, exception.Response.StatusCode);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_MessageIncludesContentWhenPresent()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.NotFound)
        {
            ReasonPhrase = "Not Found",
            Content = new StringContent("Resource not found", Encoding.UTF8, "text/plain"),
        };

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.Contains("404", exception.Message);
        Assert.Contains("Not Found", exception.Message);
        Assert.Contains("Resource not found", exception.Message);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_MessageOmitsContentWhenEmpty()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.NoContent)
        {
            ReasonPhrase = "No Content",
            Content = new StringContent(string.Empty, Encoding.UTF8, "text/plain"),
        };

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.Contains("204", exception.Message);
        Assert.Contains("No Content", exception.Message);
        Assert.DoesNotContain(" - ", exception.Message); // Content separator not present
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_HandlesMultiValueHeaders()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("Test", Encoding.UTF8, "text/plain"),
        };
        response.Headers.TryAddWithoutValidation("Accept-Encoding", new[] { "gzip", "deflate", "br" });

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.Contains("Accept-Encoding: gzip, deflate, br", exception.Headers);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_ThrowsOnNullResponse()
    {
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(async () =>
            await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(null!)
        );
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_HandlesBinaryContent()
    {
        // Arrange
        byte[] binaryData = new byte[1024];
        Array.Fill(binaryData, (byte)0xFF);
        var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(binaryData) };
        response.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.Contains("<image/png; 1024 bytes>", exception.Content);
        Assert.False(exception.ContentTruncated);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_HandlesBinaryContentWithStreamContent()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StreamContent(new MemoryStream(new byte[512])),
        };
        response.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert
        Assert.Contains("<application/pdf;", exception.Content);
        // StreamContent may or may not have ContentLength set depending on the stream
        Assert.Matches(@"<application/pdf; (unknown size|\d+ bytes)>", exception.Content);
        Assert.False(exception.ContentTruncated);
    }

    [Fact]
    public async Task CreateAndDisposeHttpResponse_HandlesNullReasonPhrase()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            ReasonPhrase = null,
            Content = new StringContent("OK", Encoding.UTF8, "text/plain"),
        };

        // Act
        var exception = await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response);

        // Assert - HttpResponseMessage provides default reason phrase when null is set
        Assert.NotNull(exception.ReasonPhrase);
        Assert.Contains("200", exception.Message);
    }
}
