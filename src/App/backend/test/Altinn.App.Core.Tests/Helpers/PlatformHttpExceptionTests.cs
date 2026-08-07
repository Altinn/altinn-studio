using System.Net;
using System.Net.Http.Headers;
using System.Text;
using Altinn.App.Core.Helpers;

namespace Altinn.App.Core.Tests.Helpers;

public class PlatformHttpExceptionTests
{
    private static HttpResponseMessage TextResponse(HttpStatusCode statusCode, string content = "body") =>
        new(statusCode) { Content = new StringContent(content, Encoding.UTF8, "text/plain") };

    [Fact]
    public async Task Create_CapturesBasicProperties()
    {
        var response = new HttpResponseMessage(HttpStatusCode.InternalServerError)
        {
            ReasonPhrase = "Internal Server Error",
            Content = new StringContent("Error details", Encoding.UTF8, "text/plain"),
        };

        var exception = await PlatformHttpException.Create(response);

        Assert.Equal(HttpStatusCode.InternalServerError, exception.Response.StatusCode);
        Assert.Equal("Internal Server Error", exception.Response.ReasonPhrase);
        Assert.Equal("Error details", exception.Response.Content);
        Assert.False(exception.Response.ContentTruncated);
        Assert.Contains("500", exception.Message);
        Assert.Contains("Internal Server Error", exception.Message);
        Assert.Contains("Error details", exception.Message);
    }

    [Fact]
    public async Task StatusCode_IsShorthandForResponseStatusCode()
    {
        var exception = await PlatformHttpException.Create(TextResponse(HttpStatusCode.NotFound));

        Assert.Equal(HttpStatusCode.NotFound, exception.StatusCode);
        Assert.Equal(exception.Response.StatusCode, exception.StatusCode);
    }

    [Fact]
    public async Task Create_HandlesNullContent()
    {
        var response = new HttpResponseMessage(HttpStatusCode.NoContent) { Content = null };

        var exception = await PlatformHttpException.Create(response);

        Assert.Empty(exception.Response.Content);
        Assert.False(exception.Response.ContentTruncated);
    }

    [Fact]
    public async Task Create_HandlesEmptyContent()
    {
        var exception = await PlatformHttpException.Create(TextResponse(HttpStatusCode.OK, string.Empty));

        Assert.Empty(exception.Response.Content);
        Assert.False(exception.Response.ContentTruncated);
    }

    [Fact]
    public async Task Create_TruncatesLargeContent()
    {
        var response = TextResponse(HttpStatusCode.OK, new string('x', 20 * 1024));

        var exception = await PlatformHttpException.Create(response);

        Assert.True(exception.Response.ContentTruncated);
        Assert.Equal(PlatformHttpResponse.MaxCapturedContentLength, exception.Response.Content.Length);
        Assert.Contains("[truncated]", exception.Message);
    }

    [Fact]
    public async Task Create_DoesNotTruncateContentUnderTheLimit()
    {
        var response = TextResponse(HttpStatusCode.OK, new string('x', 10 * 1024));

        var exception = await PlatformHttpException.Create(response);

        Assert.False(exception.Response.ContentTruncated);
        Assert.Equal(10 * 1024, exception.Response.Content.Length);
        Assert.DoesNotContain("[truncated]", exception.Message);
    }

    [Fact]
    public async Task Create_RedactsSensitiveHeaders()
    {
        var response = TextResponse(HttpStatusCode.Unauthorized, "Unauthorized");
        response.Headers.TryAddWithoutValidation("Authorization", "Bearer secret-token-12345");
        response.Headers.TryAddWithoutValidation("Cookie", "session=abc123; user=john");
        response.Headers.TryAddWithoutValidation("Set-Cookie", "session=newvalue; Secure; HttpOnly");
        response.Headers.TryAddWithoutValidation("Proxy-Authorization", "Basic encoded-credentials");

        var exception = await PlatformHttpException.Create(response);
        var headers = exception.Response.Headers;

        Assert.Equal(["[REDACTED]"], headers["Authorization"]);
        Assert.Equal(["[REDACTED]"], headers["Cookie"]);
        Assert.Equal(["[REDACTED]"], headers["Set-Cookie"]);
        Assert.Equal(["[REDACTED]"], headers["Proxy-Authorization"]);

        string all = string.Join(";", headers.SelectMany(h => h.Value));
        Assert.DoesNotContain("secret-token-12345", all);
        Assert.DoesNotContain("session=abc123", all);
        Assert.DoesNotContain("session=newvalue", all);
        Assert.DoesNotContain("encoded-credentials", all);
    }

    [Fact]
    public async Task Create_RedactsHeaders_CaseInsensitively()
    {
        var response = TextResponse(HttpStatusCode.Forbidden, "Forbidden");
        response.Headers.TryAddWithoutValidation("authorization", "Bearer lowercase-token");
        response.Headers.TryAddWithoutValidation("COOKIE", "session=uppercase");
        response.Headers.TryAddWithoutValidation("sEt-CoOkIe", "session=mixedcase");
        response.Headers.TryAddWithoutValidation("PROXY-AUTHORIZATION", "Basic proxy-creds");

        var exception = await PlatformHttpException.Create(response);

        string all = string.Join(";", exception.Response.Headers.SelectMany(h => h.Value));
        Assert.DoesNotContain("lowercase-token", all);
        Assert.DoesNotContain("session=uppercase", all);
        Assert.DoesNotContain("session=mixedcase", all);
        Assert.DoesNotContain("proxy-creds", all);
    }

    [Fact]
    public async Task Create_LooksUpHeadersCaseInsensitively()
    {
        var response = TextResponse(HttpStatusCode.OK);
        response.Headers.TryAddWithoutValidation("X-Correlation-Id", "correlation-123");

        var exception = await PlatformHttpException.Create(response);

        Assert.Equal(["correlation-123"], exception.Response.Headers["x-correlation-id"]);
    }

    [Fact]
    public async Task Create_PreservesNonSensitiveHeaders()
    {
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("Success", Encoding.UTF8, "application/json"),
        };
        response.Headers.TryAddWithoutValidation("X-Correlation-Id", "correlation-123");
        response.Headers.TryAddWithoutValidation("X-Rate-Limit", "100");
        response.Headers.TryAddWithoutValidation("Cache-Control", "no-cache");

        var exception = await PlatformHttpException.Create(response);
        var headers = exception.Response.Headers;

        Assert.Equal(["correlation-123"], headers["X-Correlation-Id"]);
        Assert.Equal(["100"], headers["X-Rate-Limit"]);
        Assert.Equal(["no-cache"], headers["Cache-Control"]);
    }

    [Fact]
    public async Task Create_CapturesContentHeaders()
    {
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("Test content", Encoding.UTF8, "application/json"),
        };
        response.Content.Headers.Add("X-Custom-Content-Header", "content-value");

        var exception = await PlatformHttpException.Create(response);
        var headers = exception.Response.Headers;

        Assert.Equal(["content-value"], headers["X-Custom-Content-Header"]);
        Assert.Equal(["application/json; charset=utf-8"], headers["Content-Type"]);
    }

    [Fact]
    public async Task Create_CapturesTrailingHeaders()
    {
        var response = TextResponse(HttpStatusCode.OK, "Test");
        response.TrailingHeaders.TryAddWithoutValidation("X-Trailing-Header", "trailing-value");

        var exception = await PlatformHttpException.Create(response);

        Assert.Equal(["trailing-value"], exception.Response.Headers["X-Trailing-Header"]);
    }

    [Fact]
    public async Task Create_RedactsSensitiveTrailingHeaders()
    {
        var response = TextResponse(HttpStatusCode.OK, "Test");
        response.TrailingHeaders.TryAddWithoutValidation("Set-Cookie", "trailing-session=secret");

        var exception = await PlatformHttpException.Create(response);

        Assert.Equal(["[REDACTED]"], exception.Response.Headers["Set-Cookie"]);
        string all = string.Join(";", exception.Response.Headers.SelectMany(h => h.Value));
        Assert.DoesNotContain("trailing-session=secret", all);
    }

    [Fact]
    public async Task Create_HandlesMultiValueHeaders()
    {
        var response = TextResponse(HttpStatusCode.OK, "Test");
        response.Headers.TryAddWithoutValidation("Accept-Encoding", ["gzip", "deflate", "br"]);

        var exception = await PlatformHttpException.Create(response);

        Assert.Equal(["gzip", "deflate", "br"], exception.Response.Headers["Accept-Encoding"]);
    }

    /// <summary>
    /// Passing an <see cref="IDisposable"/> to a method does not transfer ownership, so the caller's
    /// <c>using</c> stays in charge and must not be pre-empted.
    /// </summary>
    [Fact]
    public async Task Create_DoesNotDisposeTheResponse()
    {
        using var response = TextResponse(HttpStatusCode.OK, "Test");

        await PlatformHttpException.Create(response);

        Assert.Equal("Test", await response.Content.ReadAsStringAsync());
    }

    /// <summary>
    /// The reason the exception can afford to borrow rather than own: once the caller disposes, the
    /// snapshot is still there.
    /// </summary>
    [Fact]
    public async Task Create_SnapshotSurvivesTheCallerDisposingTheResponse()
    {
        PlatformHttpException exception;
        using (var response = TextResponse(HttpStatusCode.BadGateway, "upstream exploded"))
        {
            exception = await PlatformHttpException.Create(response);
        }

        Assert.Equal(HttpStatusCode.BadGateway, exception.Response.StatusCode);
        Assert.Equal("upstream exploded", exception.Response.Content);
    }

    [Fact]
    public async Task Create_WithExplicitMessage_UsesIt()
    {
        var inner = new InvalidOperationException("boom");

        var exception = await PlatformHttpException.Create(
            TextResponse(HttpStatusCode.Conflict, "conflict details"),
            "Failed to sign dataelements",
            inner
        );

        Assert.Equal("Failed to sign dataelements", exception.Message);
        Assert.Same(inner, exception.InnerException);
        Assert.Equal(HttpStatusCode.Conflict, exception.StatusCode);
        Assert.Equal("conflict details", exception.Response.Content);
    }

    [Fact]
    public async Task Create_ThrowsOnNullResponse()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(async () => await PlatformHttpException.Create(null!));
    }

    [Fact]
    public async Task Create_SummarizesBinaryContentInsteadOfReadingIt()
    {
        byte[] binaryData = new byte[1024];
        Array.Fill(binaryData, (byte)0xFF);
        var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(binaryData) };
        response.Content.Headers.ContentType = new MediaTypeHeaderValue("image/png");

        var exception = await PlatformHttpException.Create(response);

        Assert.Equal("<image/png; 1024 bytes>", exception.Response.Content);
        Assert.False(exception.Response.ContentTruncated);
    }

    [Fact]
    public async Task Create_SummarizesBinaryStreamContent()
    {
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StreamContent(new MemoryStream(new byte[512])),
        };
        response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");

        var exception = await PlatformHttpException.Create(response);

        Assert.Matches(@"<application/pdf; (unknown size|\d+ bytes)>", exception.Response.Content);
        Assert.False(exception.Response.ContentTruncated);
    }

    [Fact]
    public async Task Create_HandlesNullReasonPhrase()
    {
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            ReasonPhrase = null,
            Content = new StringContent("OK", Encoding.UTF8, "text/plain"),
        };

        var exception = await PlatformHttpException.Create(response);

        // HttpResponseMessage substitutes the default reason phrase when null is assigned.
        Assert.NotNull(exception.Response.ReasonPhrase);
        Assert.Contains("200", exception.Message);
    }

    /// <summary>
    /// The shape an app reaches for when faking the exception: no response to hand over, and the status
    /// code is the only part anyone branches on.
    /// </summary>
    [Fact]
    public void StatusCodeConstructor_BuildsAUsableExceptionWithoutAResponse()
    {
        var inner = new InvalidOperationException("boom");

        var exception = new PlatformHttpException(HttpStatusCode.NotFound, "Platform returned NotFound", inner);

        Assert.Equal(HttpStatusCode.NotFound, exception.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, exception.Response.StatusCode);
        Assert.Equal("Platform returned NotFound", exception.Message);
        Assert.Same(inner, exception.InnerException);
        Assert.Empty(exception.Response.Content);
        Assert.Empty(exception.Response.Headers);
    }

    /// <summary>
    /// Building the exception must never fail: it runs on the failure path, and an escape here would
    /// replace the error being reported with an unrelated one.
    /// </summary>
    [Fact]
    public async Task Create_StillSucceedsWhenTheBodyCannotBeRead()
    {
        // Unbuffered content that has already been drained — the one shape that cannot be re-read.
        using var response = new HttpResponseMessage(HttpStatusCode.BadGateway)
        {
            Content = new StreamContent(new MemoryStream(Encoding.UTF8.GetBytes("gone"))),
        };
        using (var stream = await response.Content.ReadAsStreamAsync())
        using (var reader = new StreamReader(stream, leaveOpen: true))
        {
            await reader.ReadToEndAsync();
        }

        var exception = await PlatformHttpException.Create(response, "upstream failed");

        Assert.Equal(HttpStatusCode.BadGateway, exception.StatusCode);
        Assert.Equal("upstream failed", exception.Message);
        Assert.Empty(exception.Response.Content);
    }

    /// <summary>
    /// The premise this API rests on: buffered content — everything except an explicit streaming read —
    /// can be snapshotted even after the caller has already consumed it.
    /// </summary>
    [Fact]
    public async Task Create_CapturesTheBodyEvenAfterTheCallerHasReadIt()
    {
        using var response = TextResponse(HttpStatusCode.Conflict, "already consumed by the caller");
        string consumedByCaller = await response.Content.ReadAsStringAsync();

        var exception = await PlatformHttpException.Create(response);

        Assert.Equal("already consumed by the caller", consumedByCaller);
        Assert.Equal("already consumed by the caller", exception.Response.Content);
    }

    [Fact]
    public async Task ToString_OmitsTheBodySoItDoesNotSwampLogs()
    {
        using var response = TextResponse(HttpStatusCode.InternalServerError, new string('x', 4096));
        var exception = await PlatformHttpException.Create(response);

        string rendered = exception.Response.ToString();

        Assert.DoesNotContain(new string('x', 100), rendered);
        Assert.Contains("ContentLength = 4096", rendered);
    }
}
