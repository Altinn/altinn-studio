using System;
using System.Collections.Generic;

namespace Altinn.Studio.DataModeling.Converter.Csharp;

public class CsharpCompilationException : Exception
{

    public List<string> CustomErrorMessages { get; }

    /// <inheritdoc/>
    public CsharpCompilationException(string message, List<string> customErrorMessages) : base(message + "\n\n" + string.Join("\n", customErrorMessages))
    {
        CustomErrorMessages = customErrorMessages;
    }

}
