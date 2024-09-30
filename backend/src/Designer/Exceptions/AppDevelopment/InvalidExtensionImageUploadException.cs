using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment
{
    /// <summary>
    /// Indicates that an image with invalid extension was uploaded
    /// </summary>
    [Serializable]
    public class InvalidExtensionImageUploadException : Exception
    {
        /// <inheritdoc/>
        public InvalidExtensionImageUploadException()
        {
        }

        /// <inheritdoc/>
        public InvalidExtensionImageUploadException(string message) : base(message)
        {
        }

        /// <inheritdoc/>
        public InvalidExtensionImageUploadException(string message, Exception innerException) : base(message, innerException)
        {
        }
    }
}
