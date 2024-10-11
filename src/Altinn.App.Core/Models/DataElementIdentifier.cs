using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models;

/// <summary>
/// Wrapper type for a <see cref="DataElement.Id"/> as Guid and string
/// </summary>
public readonly struct DataElementIdentifier : IEquatable<DataElementIdentifier>
{
    /// <summary>
    /// The backing field for the parsed guid that identifies a <see cref="DataElement"/>
    /// </summary>
    public Guid Guid { get; }

    /// <summary>
    /// The backing field for the string containing a guid that identifies a <see cref="DataElement"/>
    /// </summary>
    public string Id { get; }

    private DataElementIdentifier(Guid guid, string id)
    {
        Guid = guid;
        Id = id;
    }

    /// <summary>
    /// Implicit conversion to allow DataElements to be used as DataElementIds
    /// </summary>
    public static implicit operator DataElementIdentifier(DataElement dataElement) =>
        new(Guid.Parse(dataElement.Id), dataElement.Id);

    /// <summary>
    /// Make the implicit conversion from string (containing a valid guid) to DataElementIdentifier work
    /// </summary>
    public static explicit operator DataElementIdentifier(string id) => new(Guid.Parse(id), id);

    /// <summary>
    /// Make the implicit conversion from guid to DataElementIdentifier work
    /// </summary>
    public static explicit operator DataElementIdentifier(Guid guid) => new(guid, guid.ToString());

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
        return left.Equals(right);
    }

    /// <summary>
    /// Override as in a record type
    /// </summary>
    public static bool operator !=(DataElementIdentifier left, DataElementIdentifier right)
    {
        return !left.Equals(right);
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
