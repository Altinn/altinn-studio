using System;

namespace AltinnCore.Runtime.Validation
{
    /// <summary>
    /// Represents errors that occur while handling a validation request.
    /// </summary>
    public class ValidationException : Exception
    {
        /// <summary>
        /// Initialises a new instance of the <see cref="ValidationException"/> class.
        /// </summary>
        public ValidationException()
        {
        }

        /// <summary>
        /// Initialises a new instance of the <see cref="ValidationException"/> class with a specified error message.
        /// </summary>
        /// <param name="message">The message that describes the error.</param>
        public ValidationException(string message) : base(message)
        {
        }

        /// <summary>
        /// Initialises a new instance of the <see cref="ValidationException"/> class with a specified error
        /// message and a reference to the inner exception that is the cause of this exception.
        /// </summary>
        /// <param name="message">The message that describes the error.</param>
        /// <param name="inner">The exception that is the cause of the current exception, or a null reference if no inner exception is specified</param>
        public ValidationException(string message, Exception inner) : base(message, inner)
        {
        }
    }
}
