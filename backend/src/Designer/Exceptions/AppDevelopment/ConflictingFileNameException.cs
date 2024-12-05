using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment;

/// <summary>
/// Indicates that a file was uploaded with the a conflicting file name
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
