using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models;

/// <summary>
/// Wrapper class for a list of changes with methods to get changes of specific types
/// </summary>
public sealed class DataElementChanges
{
    internal DataElementChanges(IReadOnlyList<DataElementChange> allChanges)
    {
        AllChanges = allChanges;
    }

    /// <summary>
    /// Get all the changes as the abstract base class
    /// </summary>
    public IReadOnlyList<DataElementChange> AllChanges { get; }

    /// <summary>
    /// Get changes to FormData elements
    /// </summary>
    public IEnumerable<FormDataChange> FormDataChanges => AllChanges.OfType<FormDataChange>();

    /// <summary>
    /// Get changes to attachments elements
    /// </summary>
    public IEnumerable<BinaryDataChange> BinaryDataChanges => AllChanges.OfType<BinaryDataChange>();
}

/// <summary>
/// Represents a change in a data element with current and previous deserialized data
/// </summary>
public abstract class DataElementChange
{
    /// <summary>
    /// The type of update: Create, Update or Delete
    /// </summary>
    public required ChangeType Type { get; init; }

    /// <summary>
    /// The data element the change is related to (null if a new data element)
    /// </summary>
    public required DataElement? DataElement { get; set; } // needs to be set after saving new elements to storage

    /// <summary>
    /// The data element identifier or an exception if accessed before it was set
    /// </summary>
    public DataElementIdentifier DataElementIdentifier =>
        DataElement ?? throw new InvalidOperationException("DataElement was accessed before it was set");

    /// <summary>
    /// The data type of the data element
    /// </summary>
    public required DataType DataType { get; init; }

    /// <summary>
    /// The content type of element in storage
    /// </summary>
    public required string ContentType { get; init; }
}

/// <summary>
/// The type of change to a data element
/// </summary>
public enum ChangeType
{
    /// <summary>
    /// The data element was created and will not have <see cref="DataElementChange.DataElement"/> set
    /// </summary>
    Created,

    /// <summary>
    /// The data element was updated and will have a <see cref="DataElementChange.DataElement"/> set
    /// </summary>
    Updated,

    /// <summary>
    /// The data element was deleted and will have <see cref="DataElementChange.DataElement"/> set
    /// </summary>
    Deleted,
}

/// <summary>
/// Representation of a change to a binary data element
/// </summary>
public sealed class BinaryDataChange : DataElementChange
{
    /// <summary>
    /// The file name of the attachment file
    /// </summary>
    public required string? FileName { get; init; }

    /// <summary>
    /// The binary data
    /// </summary>
    public required ReadOnlyMemory<byte> CurrentBinaryData { get; init; }
}

/// <summary>
/// A change to a data element
/// </summary>
public sealed class FormDataChange : DataElementChange
{
    /// <summary>
    /// The state of the data element before the change
    /// </summary>
    public required object PreviousFormData { get; init; }

    /// <summary>
    /// The state of the data element after the change
    /// </summary>
    public required object CurrentFormData { get; init; }

    /// <summary>
    /// The binary representation (for storage) of the data element before changes
    /// </summary>
    /// <remarks>Empty memory for new data elements</remarks>
    public required ReadOnlyMemory<byte> PreviousBinaryData { get; init; }

    /// <summary>
    /// The binary representation (for storage) of the data element after changes
    /// </summary>
    /// <remarks>
    /// This is null during data processing, because the deserialized data
    /// is still valid for editing, and the binary data can't keep up with the
    /// changes
    ///
    /// Availible during validation, because then the data should not be
    /// changed, and it is used for storing and for verification that validators
    /// does not mutate the data.
    ///
    /// For deleted data elements this is set to <see cref="ReadOnlyMemory{T}.Empty"/>
    /// </remarks>
    public required ReadOnlyMemory<byte>? CurrentBinaryData { get; init; }
}
