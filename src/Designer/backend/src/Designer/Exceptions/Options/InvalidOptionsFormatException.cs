#nullable disable
using System;

namespace Altinn.Studio.Designer.Exceptions.Options;

/// <summary>
/// Indicates that an error occurred during json serialization of options.
/// </summary>
[Serializable]
public class InvalidOptionsFormatException : Exception
{
    /// <inheritdoc/>
    public InvalidOptionsFormatException()
    {
    }

    /// <inheritdoc/>
    public InvalidOptionsFormatException(string message) : base(message)
    {
    }

    /// <inheritdoc/>
    public InvalidOptionsFormatException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
