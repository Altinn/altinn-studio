using System;
using System.Runtime.Serialization;

namespace Altinn.Studio.DataModeling.Converter.Csharp;

public class CsharpCompilationException : Exception
{
    /// <inheritdoc/>
    public CsharpCompilationException()
    {
    }

    /// <inheritdoc/>
    public CsharpCompilationException(string message) : base(message)
    {
    }

    /// <inheritdoc/>
    public CsharpCompilationException(string message, Exception innerException) : base(message, innerException)
    {
    }

    /// <inheritdoc/>
    protected CsharpCompilationException(SerializationInfo info, StreamingContext context) : base(info, context)
    {
    }

}
