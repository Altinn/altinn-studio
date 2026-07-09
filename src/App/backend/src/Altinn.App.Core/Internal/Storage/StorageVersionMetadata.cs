using System.Globalization;
using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Storage;

internal sealed record StorageVersionMetadata(int? InstanceVersion = null, int? ProcessStateVersion = null)
{
    public static StorageVersionMetadata Empty { get; } = new();

    public StorageVersionMetadata Merge(StorageVersionMetadata other) =>
        new(
            MergeVersion(InstanceVersion, other.InstanceVersion),
            MergeVersion(ProcessStateVersion, other.ProcessStateVersion)
        );

    private static int? MergeVersion(int? current, int? incoming) =>
        (current, incoming) switch
        {
            (null, null) => null,
            ({ } currentValue, null) => currentValue,
            (null, { } incomingValue) => incomingValue,
            ({ } currentValue, { } incomingValue) => Math.Max(currentValue, incomingValue),
        };
}

internal sealed record StorageDataElementMetadata(string? ETag = null);

internal sealed record StorageWritePreconditions(
    int? ProcessStateVersion = null,
    string? ContentETag = null,
    int? InstanceVersion = null,
    string? IdempotencyKey = null
);

internal sealed record StorageDataMetadata(
    StorageVersionMetadata Versions,
    IReadOnlyDictionary<string, StorageDataElementMetadata> DataElements
)
{
    public static StorageDataMetadata Empty { get; } =
        new(StorageVersionMetadata.Empty, new Dictionary<string, StorageDataElementMetadata>());
}

internal sealed record InstanceWithStorageMetadata(Instance Instance, StorageVersionMetadata Metadata);

internal sealed record DataElementWithStorageMetadata(
    DataElement DataElement,
    StorageDataElementMetadata Metadata,
    StorageVersionMetadata Versions
);

internal sealed record DataBytesWithStorageMetadata(byte[] Bytes, StorageDataElementMetadata Metadata);

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

    public static StorageDataElementMetadata ReadDataElementMetadata(HttpResponseMessage response) =>
        new(response.Headers.ETag?.ToString());

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

        if (preconditions?.ContentETag is { } eTag)
        {
            headers.IfMatch.Add(EntityTagHeaderValue.Parse(eTag));
        }

        if (preconditions?.IdempotencyKey is { Length: > 0 } idempotencyKey)
        {
            headers.Add(IdempotencyKeyHeaderName, idempotencyKey);
        }
    }
}

internal static class InstanceStorageMetadataRegistry
{
    private static readonly ConditionalWeakTable<Instance, Holder> _instances = new();

    public static void Set(Instance instance, StorageVersionMetadata metadata)
    {
        if (metadata == StorageVersionMetadata.Empty)
        {
            return;
        }

        _instances.Remove(instance);
        _instances.Add(instance, new Holder(metadata));
    }

    public static StorageVersionMetadata Get(Instance instance) =>
        _instances.TryGetValue(instance, out Holder? holder) ? holder.Metadata : StorageVersionMetadata.Empty;

    private sealed class Holder(StorageVersionMetadata metadata)
    {
        public StorageVersionMetadata Metadata { get; } = metadata;
    }
}
