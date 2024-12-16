using System;

namespace Altinn.Studio.DataModeling.Converter.Csharp
{
    /// <summary>
    /// Indicates that an error occurred during C# code generation.
    /// </summary>
    [Serializable]
    public class CsharpGenerationException : Exception
    {
        /// <inheritdoc/>
        public CsharpGenerationException()
        {
        }

        /// <inheritdoc/>
        public CsharpGenerationException(string message) : base(message)
        {
        }

        /// <inheritdoc/>
        public CsharpGenerationException(string message, Exception innerException) : base(message, innerException)
        {
        }
    }
}
