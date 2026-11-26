namespace Altinn.Studio.Preview.AppApi;

// Storage's instance model, in the app API's JSON, which is camelCase.

internal sealed class Instance
{
    /// <summary><c>{partyId}/{instanceGuid}</c>.</summary>
    public required string Id { get; init; }

    public required InstanceOwner InstanceOwner { get; init; }

    /// <summary><c>{org}/{app}</c>.</summary>
    public required string AppId { get; init; }

    public required string Org { get; init; }

    public required DateTimeOffset Created { get; init; }

    public required DateTimeOffset LastChanged { get; set; }

    public required ProcessState Process { get; set; }

    public List<DataElement> Data { get; init; } = [];

    // What the app API answers with for every instance, which preview derives rather than keeps.

    public string CreatedBy => MockUser.Id;

    public string LastChangedBy => MockUser.Id;

    public DateTimeOffset? DueBefore => null;

    public DateTimeOffset? VisibleAfter => null;

    public ResourceLinks SelfLinks => new(Apps: null, Platform: null);

    public InstanceStatus Status =>
        new(IsArchived: Process.Ended is not null, IsSoftDeleted: false, IsHardDeleted: false);

    public IReadOnlyList<object> CompleteConfirmations => [];

    public IReadOnlyDictionary<string, string> PresentationTexts => new Dictionary<string, string>();

    public IReadOnlyDictionary<string, string> DataValues => new Dictionary<string, string>();
}

/// <summary>The party that owns an instance. Every party in preview is the mock user's, a person without these IDs.</summary>
internal sealed record InstanceOwner(string PartyId)
{
    public string? PersonNumber => null;

    public string? OrganisationNumber => null;

    public string? Username => null;
}

internal sealed record ResourceLinks(string? Apps, string? Platform);

internal sealed record InstanceStatus(bool IsArchived, bool IsSoftDeleted, bool IsHardDeleted);

internal sealed class ProcessState
{
    public required DateTimeOffset Started { get; init; }

    public string? StartEvent { get; init; }

    public ProcessTask? CurrentTask { get; set; }

    public DateTimeOffset? Ended { get; set; }

    public string? EndEvent { get; set; }
}

internal sealed class ProcessTask
{
    public required int Flow { get; init; }

    public required DateTimeOffset Started { get; init; }

    public required string ElementId { get; init; }

    public required string Name { get; init; }

    public required string AltinnTaskType { get; init; }
}

internal sealed class DataElement
{
    public required string Id { get; init; }

    public required string InstanceGuid { get; init; }

    public required string DataType { get; init; }

    public required string ContentType { get; init; }

    public required string BlobStoragePath { get; init; }

    public long Size { get; set; }

    public bool Locked { get; set; }

    public List<string> Refs { get; init; } = [];

    public List<string> Tags { get; init; } = [];

    public required DateTimeOffset Created { get; init; }

    public required string CreatedBy { get; init; }

    public required DateTimeOffset LastChanged { get; set; }

    public required string LastChangedBy { get; set; }
}
