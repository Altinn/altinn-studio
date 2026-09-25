using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment;

/// <summary>
/// Indicates that a Subform component does not name the layout set of its subform
/// </summary>
[Serializable]
public class SubformComponentMissingLayoutSetException : Exception
{
    /// <inheritdoc/>
    public SubformComponentMissingLayoutSetException() { }

    /// <inheritdoc/>
    public SubformComponentMissingLayoutSetException(string message)
        : base(message) { }

    /// <inheritdoc/>
    public SubformComponentMissingLayoutSetException(string message, Exception innerException)
        : base(message, innerException) { }
}
