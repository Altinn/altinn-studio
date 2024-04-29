using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment
{
    /// <summary>
    /// Indicates that an error occurred during C# code generation.
    /// </summary>
    [Serializable]
    public class InvalidLayoutSetIdException : Exception
    {
        /// <inheritdoc/>
        public InvalidLayoutSetIdException()
        {
        }

        /// <inheritdoc/>
        public InvalidLayoutSetIdException(string message) : base(message)
        {
        }

        /// <inheritdoc/>
        public InvalidLayoutSetIdException(string message, Exception innerException) : base(message, innerException)
        {
        }
    }
}
