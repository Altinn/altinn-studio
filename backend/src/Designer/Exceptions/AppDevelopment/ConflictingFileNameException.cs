using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment;

/// <summary>
/// Indicates that an error occurred during C# code generation.
/// </summary>
[Serializable]
public class ConflictingFileNameException : Exception
{
    /// <inheritdoc/>
    public ConflictingFileNameException()
    {
    }

    /// <inheritdoc/>
    public ConflictingFileNameException(string message) : base(message)
    {
    }

    /// <inheritdoc/>
    public ConflictingFileNameException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
