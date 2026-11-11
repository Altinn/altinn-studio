namespace Altinn.Studio.Preview.AppApi;

// The parts of Storage's instance model that the app frontend reads, in the app API's JSON, which is camelCase.

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
}

internal sealed record InstanceOwner(string PartyId);

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
