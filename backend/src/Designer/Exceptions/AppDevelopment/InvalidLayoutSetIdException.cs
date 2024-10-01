using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment
{
    /// <summary>
    /// Indicates that a layout set id is invalid
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
