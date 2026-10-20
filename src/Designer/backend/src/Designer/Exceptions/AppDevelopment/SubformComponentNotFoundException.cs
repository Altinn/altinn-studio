using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment;

/// <summary>
/// Indicates that a layout set has no Subform component with the requested id
/// </summary>
[Serializable]
public class SubformComponentNotFoundException : Exception
{
    /// <inheritdoc/>
    public SubformComponentNotFoundException() { }

    /// <inheritdoc/>
    public SubformComponentNotFoundException(string message)
        : base(message) { }

    /// <inheritdoc/>
    public SubformComponentNotFoundException(string message, Exception innerException)
        : base(message, innerException) { }
}
