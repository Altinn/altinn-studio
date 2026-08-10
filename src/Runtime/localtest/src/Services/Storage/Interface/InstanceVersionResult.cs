#nullable disable

using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Repository;

/// <summary>
/// Current storage-owned versions for an instance.
/// </summary>
public sealed record InstanceVersionResult(int InstanceVersion, int ProcessStateVersion)
{
    /// <summary>
    /// Allows older boolean delete assertions to keep treating a returned version result as success.
    /// </summary>
    public static implicit operator bool(InstanceVersionResult result) => result is not null;
}

/// <summary>
/// Result from a data-element write that also changed or observed parent instance versions.
/// </summary>
public sealed record DataElementWriteResult<T>(
    T DataElement,
    int InstanceVersion,
    int ProcessStateVersion
)
{
    /// <summary>
    /// Allows existing call sites that only need the data element to keep assigning the result.
    /// </summary>
    public static implicit operator T(DataElementWriteResult<T> result) =>
        result is null ? default : result.DataElement;
}

/// <summary>
/// Result from an uploaded data element that also changed parent instance versions.
/// </summary>
public sealed record DataUploadResult(
    DataElement DataElement,
    int InstanceVersion,
    int ProcessStateVersion
);
