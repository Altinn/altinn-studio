using System.Globalization;
using System.Net.Http.Headers;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Storage;

internal sealed record StorageVersionMetadata(int? InstanceVersion = null, int? ProcessStateVersion = null)
{
    public static StorageVersionMetadata Empty { get; } = new();
}

internal sealed record StorageWritePreconditions(
    int? ProcessStateVersion = null,
    string? BlobVersionId = null,
    int? InstanceVersion = null,
    string? IdempotencyKey = null
);

internal sealed record InstanceWithStorageMetadata(Instance Instance, StorageVersionMetadata Metadata);

internal sealed record DataElementWithStorageMetadata(DataElement DataElement, StorageVersionMetadata Versions);

internal sealed record DeleteDataWithStorageMetadata(bool Deleted, StorageVersionMetadata Metadata);

internal static class StorageResponseMetadata
{
    internal const string InstanceVersionHeaderName = "Instance-Version";
    internal const string ProcessStateVersionHeaderName = "Process-State-Version";

    public static StorageVersionMetadata ReadVersionMetadata(HttpResponseMessage response) =>
        new(
            ReadPositiveIntHeader(response.Headers, InstanceVersionHeaderName),
            ReadPositiveIntHeader(response.Headers, ProcessStateVersionHeaderName)
        );

    private static int? ReadPositiveIntHeader(HttpResponseHeaders headers, string name)
    {
        if (!headers.TryGetValues(name, out IEnumerable<string>? values))
        {
            return null;
        }

        string? value = values.SingleOrDefault();
        if (int.TryParse(value, out int parsed) && parsed > 0)
        {
            return parsed;
        }

        return null;
    }
}

internal static class StoragePreconditionHeaders
{
    internal const string IfInstanceVersionMatchHeaderName = "If-Instance-Version-Match";
    internal const string IfProcessStateVersionMatchHeaderName = "If-Process-State-Version-Match";
    internal const string IdempotencyKeyHeaderName = "Idempotency-Key";

    public static void Add(HttpRequestHeaders headers, StorageWritePreconditions? preconditions)
    {
        if (preconditions?.InstanceVersion is { } instanceVersion)
        {
            headers.Add(IfInstanceVersionMatchHeaderName, instanceVersion.ToString(CultureInfo.InvariantCulture));
        }

        if (preconditions?.ProcessStateVersion is { } processStateVersion)
        {
            headers.Add(
                IfProcessStateVersionMatchHeaderName,
                processStateVersion.ToString(CultureInfo.InvariantCulture)
            );
        }

        if (preconditions?.BlobVersionId is { Length: > 0 } blobVersionId)
        {
            headers.IfMatch.Add(new EntityTagHeaderValue($"\"{blobVersionId}\""));
        }

        if (preconditions?.IdempotencyKey is { Length: > 0 } idempotencyKey)
        {
            headers.Add(IdempotencyKeyHeaderName, idempotencyKey);
        }
    }
}
