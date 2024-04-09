using System;
using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Exceptions
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

        /// <inheritdoc/>
        protected InvalidLayoutSetIdException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }

    }
}
