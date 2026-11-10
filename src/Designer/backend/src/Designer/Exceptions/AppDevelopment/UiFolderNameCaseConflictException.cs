using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment;

/// <summary>
/// Indicates that a new UI folder name differs only in case from an existing UI folder, so creating it
/// would on a case-insensitive file system address the existing folder instead.
/// </summary>
[Serializable]
public class UiFolderNameCaseConflictException : Exception
{
    /// <inheritdoc/>
    public UiFolderNameCaseConflictException() { }

    /// <inheritdoc/>
    public UiFolderNameCaseConflictException(string message)
        : base(message) { }

    /// <inheritdoc/>
    public UiFolderNameCaseConflictException(string message, Exception innerException)
        : base(message, innerException) { }
}
