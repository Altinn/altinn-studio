using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment
{
    /// <summary>
    /// Indicates that an error occurred during C# code generation.
    /// </summary>
    [Serializable]
    public class NoLayoutSetsFileFoundException : Exception
    {
        /// <inheritdoc/>
        public NoLayoutSetsFileFoundException()
        {
        }

        /// <inheritdoc/>
        public NoLayoutSetsFileFoundException(string message) : base(message)
        {
        }

        /// <inheritdoc/>
        public NoLayoutSetsFileFoundException(string message, Exception innerException) : base(message, innerException)
        {
        }
    }
}
