using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment
{
    /// <summary>
    /// Indicates that an error occurred during C# code generation.
    /// </summary>
    [Serializable]
    public class NonUniqueTaskForLayoutSetException : Exception
    {
        /// <inheritdoc/>
        public NonUniqueTaskForLayoutSetException()
        {
        }

        /// <inheritdoc/>
        public NonUniqueTaskForLayoutSetException(string message) : base(message)
        {
        }

        /// <inheritdoc/>
        public NonUniqueTaskForLayoutSetException(string message, Exception innerException) : base(message, innerException)
        {
        }
    }
}
