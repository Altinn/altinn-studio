using System.Net;
using System.Text.Json;
using Altinn.App.Core.Helpers;

namespace Altinn.App.Core.Internal.Storage;

/// <summary>
/// Identifies Storage's machine-readable process-status compare-and-set conflict.
/// </summary>
internal sealed class StorageProcessStatusConflictException : PlatformHttpException
{
    internal const string ErrorCode = "process_status_conflict";

    private StorageProcessStatusConflictException(PlatformHttpResponse response, string message)
        : base(response, message) { }

    internal static async Task<StorageProcessStatusConflictException?> TryCreate(
        HttpResponseMessage response,
        CancellationToken cancellationToken
    )
    {
        if (
            response.StatusCode != HttpStatusCode.Conflict
            || !string.Equals(
                response.Content.Headers.ContentType?.MediaType,
                "application/problem+json",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return null;
        }

        string content = await response.Content.ReadAsStringAsync(cancellationToken);
        try
        {
            using JsonDocument document = JsonDocument.Parse(content);
            if (
                document.RootElement.ValueKind != JsonValueKind.Object
                || !document.RootElement.TryGetProperty("type", out JsonElement type)
                || type.ValueKind != JsonValueKind.String
                || !string.Equals(type.GetString(), ErrorCode, StringComparison.Ordinal)
            )
            {
                return null;
            }
        }
        catch (JsonException)
        {
            return null;
        }

        string message = $"{(int)response.StatusCode} - {response.ReasonPhrase} - {content}";
        PlatformHttpResponse snapshot = await PlatformHttpResponse.Snapshot(response, cancellationToken);
        return new StorageProcessStatusConflictException(snapshot, message);
    }
}
