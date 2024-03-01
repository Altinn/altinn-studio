using System.Runtime.Serialization;

namespace Altinn.App.Core.Internal.App
{
    /// <summary>
    /// Configuration is not valid for application
    /// </summary>
    public class ApplicationConfigException : Exception
    {

        /// <summary>
        /// Create ApplicationConfigException
        /// </summary>
        public ApplicationConfigException()
        {
        }

        /// <summary>
        /// Create ApplicationConfigException
        /// </summary>
        /// <param name="message">Exception message</param>
        public ApplicationConfigException(string? message) : base(message)
        {
        }

        /// <summary>
        /// Create ApplicationConfigException
        /// </summary>
        /// <param name="message">Exception message</param>
        /// <param name="innerException">Inner exception</param>
        public ApplicationConfigException(string? message, Exception? innerException) : base(message, innerException)
        {
        }
    }
}
