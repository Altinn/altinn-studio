using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models;

/// <summary>
/// Wrapper type for a <see cref="DataElement.Id"/> as Guid and string
/// </summary>
public readonly struct DataElementIdentifier : IEquatable<DataElementIdentifier>
{
    /// <summary>
    /// The parsed guid that identifies a <see cref="DataElement"/>
    /// </summary>
    public Guid Guid { get; }

    /// <summary>
    /// The backing field for the string containing a guid that identifies a <see cref="DataElement"/>
    /// </summary>
    public string Id { get; }

    /// <summary>
    /// The backing field for the data type of the <see cref="DataElement"/>
    /// </summary>
    public string? DataTypeId { get; }

    /// <summary>
    /// Constructor that takes a string representation of a guid
    /// </summary>
    /// <param name="id">The <see cref="DataElement.Id"/></param>
    public DataElementIdentifier(string id)
    {
        Guid = Guid.Parse(id);
        Id = id;
    }

    /// <summary>
    /// Constructor that takes a guid
    /// </summary>
    /// <param name="guid">The <see cref="DataElement.Id"/> parsed as a guid</param>
    public DataElementIdentifier(Guid guid)
    {
        Guid = guid;
        Id = guid.ToString();
    }

    /// <summary>
    /// Constructor that initializes from a <see cref="DataElement"/>
    /// </summary>
    public DataElementIdentifier(DataElement dataElement)
    {
        Guid = Guid.Parse(dataElement.Id);
        Id = dataElement.Id;
        DataTypeId = dataElement.DataType;
    }

    /// <summary>
    /// Implicit conversion to allow DataElements to be used as DataElementIds
    /// </summary>
    public static implicit operator DataElementIdentifier(DataElement dataElement) => new(dataElement);

    /// <summary>
    /// Implicit conversion to allow DataElements to be used as DataElementIds,
    /// but accept and return null values
    /// </summary>
    public static implicit operator DataElementIdentifier?(DataElement? dataElement) =>
        dataElement is null ? default : new(dataElement);

    /// <summary>
    /// Make the ToString method return the ID
    /// </summary>
    public override string ToString()
    {
        return Id;
    }

    /// <summary>
    /// Override as in a record type
    /// </summary>
    public static bool operator ==(DataElementIdentifier left, DataElementIdentifier right)
    {
        return left.Guid.Equals(right.Guid);
    }

    /// <summary>
    /// Override as in a record type
    /// </summary>
    public static bool operator !=(DataElementIdentifier left, DataElementIdentifier right)
    {
        return !left.Guid.Equals(right.Guid);
    }

    /// <inheritdoc />
    public override bool Equals(object? obj)
    {
        return obj is DataElementIdentifier other && Equals(other);
    }

    /// <summary>
    /// Override equality to only compare the guid
    /// </summary>
    public bool Equals(DataElementIdentifier other)
    {
        return Guid.Equals(other.Guid);
    }

    /// <summary>
    /// Override equality to only compare the guid
    /// </summary>
    public override int GetHashCode()
    {
        return Guid.GetHashCode();
    }
}
