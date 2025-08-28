using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment
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
    }
}
