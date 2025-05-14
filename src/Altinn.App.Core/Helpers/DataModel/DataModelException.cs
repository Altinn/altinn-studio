using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Helpers.DataModel;

/// <summary>
/// Custom exception for errors when reading from a datamodel
/// </summary>
public class DataModelException : AltinnException
{
    /// <inheritdoc />
    public DataModelException(string msg)
        : base(msg) { }
}
