namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Indicates that a data element changed after its containing instance snapshot was loaded.
/// </summary>
internal sealed class DataElementContentConflictException : InstanceStateConflictException
{
    public DataElementContentConflictException(string instanceId, Guid dataElementId, Exception innerException)
        : base(
            $"Data element {dataElementId} for instance {instanceId} changed after the instance was loaded.",
            innerException
        )
    {
        InstanceId = instanceId;
        DataElementId = dataElementId;
    }

    public string InstanceId { get; }

    public Guid DataElementId { get; }
}
