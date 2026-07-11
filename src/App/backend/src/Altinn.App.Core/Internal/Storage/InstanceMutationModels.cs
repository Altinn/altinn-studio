using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;

namespace Altinn.App.Core.Internal.Storage;

internal sealed class StorageInstanceMutationRequest
{
    [JsonProperty(PropertyName = "createDataElements")]
    public List<StorageInstanceMutationCreateDataElement> CreateDataElements { get; } = [];

    [JsonProperty(PropertyName = "updateDataElements")]
    public List<StorageInstanceMutationUpdateDataElement> UpdateDataElements { get; } = [];

    [JsonProperty(PropertyName = "deleteDataElements")]
    public List<StorageInstanceMutationDeleteDataElement> DeleteDataElements { get; } = [];

    [JsonProperty(PropertyName = "deleteInstance")]
    public StorageInstanceMutationDeleteInstance? DeleteInstance { get; set; }

    [JsonProperty(PropertyName = "dataValues")]
    public Dictionary<string, string?> DataValues { get; } = [];

    [JsonProperty(PropertyName = "presentationTexts")]
    public Dictionary<string, string?> PresentationTexts { get; } = [];

    [JsonProperty(PropertyName = "processState")]
    public StorageInstanceMutationProcessStateUpdate? ProcessState { get; set; }
}

internal sealed class StorageInstanceMutationCreateDataElement
{
    [JsonProperty(PropertyName = "dataType")]
    public required string DataType { get; init; }

    [JsonProperty(PropertyName = "contentPartName")]
    public required string ContentPartName { get; init; }

    [JsonProperty(PropertyName = "contentType")]
    public string? ContentType { get; init; }

    [JsonProperty(PropertyName = "filename")]
    public string? Filename { get; init; }

    [JsonProperty(PropertyName = "refs")]
    public List<Guid>? Refs { get; init; }

    [JsonProperty(PropertyName = "generatedFromTask")]
    public string? GeneratedFromTask { get; init; }

    [JsonProperty(PropertyName = "metadata")]
    public List<KeyValueEntry>? Metadata { get; init; }

    [JsonProperty(PropertyName = "userDefinedMetadata")]
    public List<KeyValueEntry>? UserDefinedMetadata { get; init; }

    [JsonProperty(PropertyName = "tags")]
    public List<string>? Tags { get; init; }

    [JsonProperty(PropertyName = "locked")]
    public bool? Locked { get; init; }
}

internal sealed class StorageInstanceMutationUpdateDataElement
{
    [JsonProperty(PropertyName = "dataElementId")]
    public required Guid DataElementId { get; init; }

    [JsonProperty(PropertyName = "contentPartName")]
    public string? ContentPartName { get; init; }

    [JsonProperty(PropertyName = "expectedCurrentBlobVersion")]
    public string? ExpectedCurrentBlobVersion { get; init; }

    [JsonProperty(PropertyName = "contentType")]
    public string? ContentType { get; init; }

    [JsonProperty(PropertyName = "filename")]
    public string? Filename { get; init; }

    [JsonProperty(PropertyName = "refs")]
    public List<Guid>? Refs { get; init; }

    [JsonProperty(PropertyName = "generatedFromTask")]
    public string? GeneratedFromTask { get; init; }

    [JsonProperty(PropertyName = "metadata")]
    public List<KeyValueEntry>? Metadata { get; init; }

    [JsonProperty(PropertyName = "userDefinedMetadata")]
    public List<KeyValueEntry>? UserDefinedMetadata { get; init; }

    [JsonProperty(PropertyName = "tags")]
    public List<string>? Tags { get; init; }

    [JsonProperty(PropertyName = "deleteStatus")]
    public DeleteStatus? DeleteStatus { get; init; }

    [JsonProperty(PropertyName = "locked")]
    public bool? Locked { get; init; }
}

internal sealed class StorageInstanceMutationDeleteDataElement
{
    [JsonProperty(PropertyName = "dataElementId")]
    public required Guid DataElementId { get; init; }

    [JsonProperty(PropertyName = "ignoreLock")]
    public bool IgnoreLock { get; init; }
}

internal sealed class StorageInstanceMutationDeleteInstance
{
    [JsonProperty(PropertyName = "hard")]
    public required bool Hard { get; init; }
}

internal sealed class StorageInstanceMutationProcessStateUpdate
{
    [JsonProperty(PropertyName = "state")]
    public ProcessState? State { get; init; }

    [JsonProperty(PropertyName = "events")]
    public List<InstanceEvent>? Events { get; init; }
}

internal sealed class StorageInstanceMutationResponse
{
    [JsonProperty(PropertyName = "instance")]
    public Instance? Instance { get; init; }

    [JsonProperty(PropertyName = "createdDataElementIds")]
    public List<Guid>? CreatedDataElementIds { get; init; }

    [JsonProperty(PropertyName = "replayed")]
    public bool Replayed { get; init; }
}

internal sealed record StorageInstanceMutationContent(
    ReadOnlyMemory<byte> Bytes,
    string ContentType,
    string? Filename = null
);

internal sealed record InstanceMutationWithStorageMetadata
{
    public InstanceMutationWithStorageMetadata(
        Instance instance,
        IReadOnlyDictionary<string, StorageDataElementMetadata> dataElementMetadata,
        StorageVersionMetadata metadata,
        IReadOnlyList<Guid>? createdDataElementIds = null,
        bool replayed = false
    )
    {
        Instance = instance;
        DataElementMetadata = dataElementMetadata;
        Metadata = metadata;
        CreatedDataElementIds = createdDataElementIds ?? [];
        Replayed = replayed;
    }

    public Instance Instance { get; }

    public IReadOnlyDictionary<string, StorageDataElementMetadata> DataElementMetadata { get; }

    public StorageVersionMetadata Metadata { get; }

    public IReadOnlyList<Guid> CreatedDataElementIds { get; }

    public bool Replayed { get; }
}
