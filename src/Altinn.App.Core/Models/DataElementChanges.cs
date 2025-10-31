using Altinn.App.Core.Internal.Data;
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
    private protected DataElementChange(
        ChangeType type,
        DataType dataType,
        string contentType,
        DataElement? dataElement = null
    )
    {
        Type = type;
        DataElement = dataElement;
        DataType = dataType;
        ContentType = contentType;
    }

    /// <summary>
    /// The type of update: Create, Update or Delete
    /// </summary>
    public ChangeType Type { get; }

    /// <summary>
    /// The data element the change is related to (null if a new data element)
    /// </summary>
    public DataElement? DataElement { get; internal set; } // needs to be set after saving new elements to storage

    /// <summary>
    /// The data element identifier or an exception if accessed before it was set
    /// </summary>
    public DataElementIdentifier DataElementIdentifier =>
        DataElement ?? throw new InvalidOperationException("DataElement was accessed before it was set");

    /// <summary>
    /// The data type of the data element
    /// </summary>
    public DataType DataType { get; }

    /// <summary>
    /// The contentType of an element in storage
    /// </summary>
    public string ContentType { get; }
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
    internal BinaryDataChange(
        ChangeType type,
        DataType dataType,
        string contentType,
        DataElement? dataElement,
        string? fileName,
        ReadOnlyMemory<byte> currentBinaryData
    )
        : base(type, dataType, contentType, dataElement)
    {
        FileName = fileName;
        CurrentBinaryData = currentBinaryData;
    }

    /// <summary>
    /// The file name of the attachment file
    /// </summary>
    public string? FileName { get; }

    /// <summary>
    /// The binary data
    /// </summary>
    public ReadOnlyMemory<byte> CurrentBinaryData { get; }
}

/// <summary>
/// A change to a data element
/// </summary>
public sealed class FormDataChange : DataElementChange
{
    internal FormDataChange(
        ChangeType type,
        DataType dataType,
        string contentType,
        IFormDataWrapper previousFormDataWrapper,
        IFormDataWrapper currentFormDataWrapper,
        ReadOnlyMemory<byte> previousBinaryData,
        ReadOnlyMemory<byte>? currentBinaryData,
        DataElement? dataElement
    )
        : base(type, dataType, contentType, dataElement)
    {
        PreviousFormDataWrapper = previousFormDataWrapper;
        CurrentFormDataWrapper = currentFormDataWrapper;
        PreviousBinaryData = previousBinaryData;
        CurrentBinaryData = currentBinaryData;
    }

    /// <summary>
    /// A POCO object representing the state of the data element before the change
    /// </summary>
    public object PreviousFormData => PreviousFormDataWrapper.BackingData<object>();

    /// <summary>
    /// The previous form data wrapped in a <see cref="IFormDataWrapper"/>
    /// </summary>
    internal IFormDataWrapper PreviousFormDataWrapper { get; }

    /// <summary>
    /// A POCO object representing the state of the data element after the change
    /// </summary>
    public object CurrentFormData => CurrentFormDataWrapper.BackingData<object>();

    /// <summary>
    /// The data after the change wrapped in a <see cref="IFormDataWrapper"/>
    /// </summary>
    public IFormDataWrapper CurrentFormDataWrapper { get; }

    /// <summary>
    /// The binary representation (for storage) of the data element before changes
    /// </summary>
    /// <remarks>Empty memory for new data elements</remarks>
    public ReadOnlyMemory<byte> PreviousBinaryData { get; }

    /// <summary>
    /// The binary representation (for storage) of the data element after changes
    /// </summary>
    /// <remarks>
    /// This is null during data processing, because the deserialized data
    /// is still valid for editing, and the binary data can't keep up with the
    /// changes
    ///
    /// Available during validation, because then the data should not be
    /// changed, and it is used for storing and for verification that validators
    /// does not mutate the data.
    ///
    /// For deleted data elements this is set to <see cref="ReadOnlyMemory{T}.Empty"/>
    /// </remarks>
    public ReadOnlyMemory<byte>? CurrentBinaryData { get; }
}
