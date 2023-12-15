using System;
using System.Collections.Generic;
using System.Runtime.Serialization;

namespace Altinn.Studio.DataModeling.Converter.Csharp;

public class CsharpCompilationException : Exception
{

    public List<string> CustomErrorMessages { get; }

    /// <inheritdoc/>
    public CsharpCompilationException(string message, List<string> customErrorMessages) : base(message)
    {
        CustomErrorMessages = customErrorMessages;
    }

}
