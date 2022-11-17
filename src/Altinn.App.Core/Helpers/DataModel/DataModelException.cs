using System.Runtime.Serialization;

namespace Altinn.App.Core.Helpers.DataModel;

/// <summary>
/// Custom exception for errors when reading from a datamodel
/// </summary>
[Serializable]
public class DataModelException : Exception
{
    /// <inheritdoc />
    public DataModelException(string msg): base(msg) { }

    /// <inheritdoc />
    protected DataModelException(SerializationInfo info, StreamingContext ctxt) : base(info, ctxt) { }
}