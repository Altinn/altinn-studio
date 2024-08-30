using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models;

/// <summary>
/// Wrapper type for a <see cref="DataElement.Id"/>
/// </summary>
/// <param name="Id">The guid ID</param>
public readonly record struct DataElementId(Guid Id)
{
    /// <summary>
    /// Implicit conversion to allow DataElements to be used as DataElementIds
    /// </summary>
    public static implicit operator DataElementId(DataElement dataElement) => new(Guid.Parse(dataElement.Id));

    /// <summary>
    /// Make the ToString method return the ID
    /// </summary>
    public override string ToString()
    {
        return Id.ToString();
    }
}
