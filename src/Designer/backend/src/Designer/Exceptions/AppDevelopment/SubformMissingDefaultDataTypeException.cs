using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment;

/// <summary>
/// Indicates that the layout set of a subform is missing or has no default data type
/// </summary>
[Serializable]
public class SubformMissingDefaultDataTypeException : Exception
{
    /// <inheritdoc/>
    public SubformMissingDefaultDataTypeException() { }

    /// <inheritdoc/>
    public SubformMissingDefaultDataTypeException(string message)
        : base(message) { }

    /// <inheritdoc/>
    public SubformMissingDefaultDataTypeException(string message, Exception innerException)
        : base(message, innerException) { }
}
