using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment;

/// <summary>
/// A Subform component has no layout set reference.
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
