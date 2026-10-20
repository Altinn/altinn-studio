using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment;

/// <summary>
/// Indicates that a layout set belongs to a process task that is not a subform PDF task
/// </summary>
[Serializable]
public class LayoutSetIsNotSubformPdfTaskException : Exception
{
    /// <inheritdoc/>
    public LayoutSetIsNotSubformPdfTaskException() { }

    /// <inheritdoc/>
    public LayoutSetIsNotSubformPdfTaskException(string message)
        : base(message) { }

    /// <inheritdoc/>
    public LayoutSetIsNotSubformPdfTaskException(string message, Exception innerException)
        : base(message, innerException) { }
}
