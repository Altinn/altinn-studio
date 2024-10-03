using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models;

/// <summary>
/// Wrapper type for a <see cref="DataElement.Id"/>
/// </summary>
public readonly struct DataElementId : IEquatable<DataElementId>
{
    /// <summary>
    /// The backing field for the parsed guid that identifies a <see cref="DataElement"/>
    /// </summary>
    public Guid Guid { get; }

    /// <summary>
    /// The backing field for the string containing a guid that identifies a <see cref="DataElement"/>
    /// </summary>
    public string Id { get; }

    private DataElementId(Guid guid, string id)
    {
        Guid = guid;
        Id = id;
    }

    /// <summary>
    /// Implicit conversion to allow DataElements to be used as DataElementIds
    /// </summary>
    public static implicit operator DataElementId(DataElement dataElement) =>
        new(Guid.Parse(dataElement.Id), dataElement.Id);

    /// <summary>
    /// Make the implicit conversion from string (containing a valid guid) to DataElementIdentifier work
    /// </summary>
    public static explicit operator DataElementId(string id) => new(Guid.Parse(id), id);

    /// <summary>
    /// Make the implicit conversion from guid to DataElementIdentifier work
    /// </summary>
    public static explicit operator DataElementId(Guid guid) => new(guid, guid.ToString());

    /// <summary>
    /// Make the ToString method return the ID
    /// </summary>
    public override string ToString()
    {
        return Id;
    }

    /// <inheritdoc />
    public override bool Equals(object? obj)
    {
        return obj is DataElementId other && Equals(other);
    }

    /// <inheritdoc />
    public static bool operator ==(DataElementId left, DataElementId right)
    {
        return left.Equals(right);
    }

    /// <inheritdoc />
    public static bool operator !=(DataElementId left, DataElementId right)
    {
        return !left.Equals(right);
    }

    /// <summary>
    /// Override equality to only compare the guid
    /// </summary>
    public bool Equals(DataElementId other)
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
