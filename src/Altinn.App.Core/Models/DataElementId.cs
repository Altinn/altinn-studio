using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models;

/// <summary>
/// Wrapper type for a <see cref="DataElement.Id"/>
/// </summary>
/// <param name="Guid">The guid as a Guid</param>
/// <param name="Id">The guid ID as string</param>
/// <param name="DataType">The data type id from app metadata</param>
public readonly record struct DataElementId(Guid Guid, string Id, string DataType)
{
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

    /// <summary>
    /// Implicit conversion to allow DataElements to be used as DataElementIds
    /// </summary>
    public static implicit operator DataElementId(DataElement dataElement) =>
        new(Guid.Parse(dataElement.Id), dataElement.Id, dataElement.DataType);

    /// <summary>
    /// Make the ToString method return the ID
    /// </summary>
    public override string ToString()
    {
        return Id;
    }
}
