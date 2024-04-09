using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment
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
    }
}
