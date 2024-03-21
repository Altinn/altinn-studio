using System;
using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Exceptions
{
    /// <summary>
    /// Indicates that an error occurred during C# code generation.
    /// </summary>
    [Serializable]
    public class NonUniqueLayoutSetIdException : Exception
    {
        /// <inheritdoc/>
        public NonUniqueLayoutSetIdException()
        {
        }

        /// <inheritdoc/>
        public NonUniqueLayoutSetIdException(string message) : base(message)
        {
        }

        /// <inheritdoc/>
        public NonUniqueLayoutSetIdException(string message, Exception innerException) : base(message, innerException)
        {
        }

        /// <inheritdoc/>
        protected NonUniqueLayoutSetIdException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }

    }
}
