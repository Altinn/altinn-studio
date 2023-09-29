using System;
using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository;

/// <summary>
/// Indicates that an error occured with interaction with the local git clone files.
/// </summary>
[Serializable]
public class LocalGitCloneIoException : Exception
{
    /// <inheritdoc/>
    public LocalGitCloneIoException()
    {
    }

    /// <inheritdoc/>
    public LocalGitCloneIoException(string message) : base(message)
    {
    }

    /// <inheritdoc/>
    public LocalGitCloneIoException(string message, Exception innerException) : base(message, innerException)
    {
    }

    /// <inheritdoc/>
    protected LocalGitCloneIoException(SerializationInfo info, StreamingContext context) : base(info, context)
    {
    }
}

