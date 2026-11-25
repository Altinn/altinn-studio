using System;

namespace Altinn.Platform.Storage.Models;

/// <summary>
/// A stored blob version, including its ownership and storage context. LocalTest keeps no lifecycle metadata for a
/// version, since it has no orphan cleanup.
/// </summary>
public sealed record DataElementBlobVersion
{
    /// <summary>
    /// Gets or sets the unique blob version identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the identifier of the owning instance.
    /// </summary>
    public Guid InstanceGuid { get; set; }

    /// <summary>
    /// Gets or sets the identifier of the owning data element.
    /// </summary>
    public Guid DataElementId { get; set; }

    /// <summary>
    /// Gets or sets the application id used as the blob path prefix.
    /// </summary>
    public required string AppId { get; set; }

    /// <summary>
    /// Gets or sets the org used to locate the blob container/account.
    /// </summary>
    public required string BlobStorageOrg { get; set; }

    /// <summary>
    /// Gets or sets the storage account number, if any.
    /// </summary>
    public int? StorageAccountNumber { get; set; }

    /// <summary>
    /// Gets or sets the data type recorded when the element was deleted, if known.
    /// </summary>
    public string? DataType { get; set; }
}
