using System;
using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Exceptions
{
    /// <summary>
    /// Indicates that an error occurred during C# code generation.
    /// </summary>
    [Serializable]
    public class EmptyLayoutSetIdException : Exception
    {
        /// <inheritdoc/>
        public EmptyLayoutSetIdException()
        {
        }

        /// <inheritdoc/>
        public EmptyLayoutSetIdException(string message) : base(message)
        {
        }

        /// <inheritdoc/>
        public EmptyLayoutSetIdException(string message, Exception innerException) : base(message, innerException)
        {
        }

        /// <inheritdoc/>
        protected EmptyLayoutSetIdException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }

    }
}
