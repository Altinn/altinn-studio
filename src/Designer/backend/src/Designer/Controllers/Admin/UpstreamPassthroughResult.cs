using System;
using System.Buffers;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Controllers.Admin;

/// <summary>
/// Streams an upstream response through: the status code always, and, when the upstream declared
/// JSON, its content type and body bytes, unmodified unless the body carries the app's workflow
/// state, which is removed. No other upstream header is forwarded, and nothing is fabricated.
/// </summary>
/// <remarks>
/// <para>
/// The response goes out under Studio's origin, so only a JSON body is let through: anything else,
/// such as an ingress error page, is dropped rather than served as Studio content, and the status
/// alone tells the caller what happened. Every response is marked <c>nosniff</c>, so a browser takes
/// the declared type at its word.
/// </para>
/// <para>
/// The result owns the <see cref="HttpResponseMessage"/> and disposes it once MVC has executed it.
/// The action that produced the response therefore must not dispose it: the body still has to be
/// readable when the result runs, which happens after the action returns.
/// </para>
/// </remarks>
internal sealed class UpstreamPassthroughResult : IActionResult
{
    private static readonly string[] s_forwardedMediaTypes = ["application/json", "application/problem+json"];

    // The app's state of a workflow (its initialState and every step's stateOut) is the app's
    // instance data, and Studio does not serve it until it has an authorization model for it.
    // Designer asks for no state, but an engine older than includeState ignores the request, so
    // every body is checked here, where it leaves for the browser.
    private static readonly string[] s_appStateProperties = ["initialState", "stateOut"];

    private readonly HttpResponseMessage _upstreamResponse;
    private readonly ILogger _logger;

    public UpstreamPassthroughResult(HttpResponseMessage upstreamResponse, ILogger logger)
    {
        ArgumentNullException.ThrowIfNull(upstreamResponse);
        ArgumentNullException.ThrowIfNull(logger);
        _upstreamResponse = upstreamResponse;
        _logger = logger;
    }

    public async Task ExecuteResultAsync(ActionContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        using HttpResponseMessage upstream = _upstreamResponse;
        HttpResponse response = context.HttpContext.Response;

        response.StatusCode = (int)upstream.StatusCode;
        response.Headers.XContentTypeOptions = "nosniff";

        MediaTypeHeaderValue? contentType = upstream.Content.Headers.ContentType;
        long? contentLength = upstream.Content.Headers.ContentLength;
        if (!IsForwarded(contentType))
        {
            if (contentType is not null || contentLength > 0)
            {
                _logger.LogWarning(
                    "Runtime gateway answered {StatusCode} with a {MediaType} body; only the status was forwarded",
                    (int)upstream.StatusCode,
                    contentType?.MediaType ?? "untyped"
                );
            }
            return;
        }

        byte[] body = await upstream.Content.ReadAsByteArrayAsync(context.HttpContext.RequestAborted);
        if (body.Length > 0)
        {
            JsonDocument document;
            try
            {
                document = JsonDocument.Parse(body);
            }
            catch (JsonException)
            {
                // A body that cannot be read cannot be checked for the app's state, so it is not served.
                _logger.LogWarning(
                    "Runtime gateway answered {StatusCode} with a JSON body that could not be parsed; only the status was forwarded",
                    (int)upstream.StatusCode
                );
                return;
            }

            using (document)
            {
                if (ContainsAppState(document.RootElement))
                {
                    _logger.LogWarning(
                        "Runtime gateway answered with the app's workflow state although Designer asked for none; the state was removed"
                    );
                    body = WithoutAppState(document.RootElement);
                }
            }
        }

        response.ContentType = contentType!.ToString();
        response.ContentLength = body.Length;
        await response.Body.WriteAsync(body, context.HttpContext.RequestAborted);
    }

    private static bool IsForwarded(MediaTypeHeaderValue? contentType) =>
        contentType?.MediaType is { } mediaType
        && s_forwardedMediaTypes.Contains(mediaType, StringComparer.OrdinalIgnoreCase);

    private static bool IsAppState(JsonProperty property) => s_appStateProperties.Any(property.NameEquals);

    private static bool ContainsAppState(JsonElement element) =>
        element.ValueKind switch
        {
            JsonValueKind.Object => element
                .EnumerateObject()
                .Any(property => IsAppState(property) || ContainsAppState(property.Value)),
            JsonValueKind.Array => element.EnumerateArray().Any(ContainsAppState),
            _ => false,
        };

    private static byte[] WithoutAppState(JsonElement root)
    {
        var buffer = new ArrayBufferWriter<byte>();
        using (var writer = new Utf8JsonWriter(buffer))
        {
            Write(root, writer);
        }

        return buffer.WrittenSpan.ToArray();

        static void Write(JsonElement element, Utf8JsonWriter writer)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.Object:
                    writer.WriteStartObject();
                    foreach (
                        JsonProperty property in element.EnumerateObject().Where(property => !IsAppState(property))
                    )
                    {
                        writer.WritePropertyName(property.Name);
                        Write(property.Value, writer);
                    }
                    writer.WriteEndObject();
                    break;
                case JsonValueKind.Array:
                    writer.WriteStartArray();
                    foreach (JsonElement item in element.EnumerateArray())
                    {
                        Write(item, writer);
                    }
                    writer.WriteEndArray();
                    break;
                default:
                    element.WriteTo(writer);
                    break;
            }
        }
    }
}
