using System;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Exceptions
{
    /// <summary>
    /// Exception thrown when attempting to checkout a branch with uncommitted changes
    /// </summary>
    public class UncommittedChangesException : Exception
    {
        /// <summary>
        /// Gets the uncommitted changes error details
        /// </summary>
        public UncommittedChangesError ErrorDetails { get; }

        /// <summary>
        /// Initializes a new instance of the <see cref="UncommittedChangesException"/> class.
        /// </summary>
        /// <param name="errorDetails">The uncommitted changes error details</param>
        public UncommittedChangesException(UncommittedChangesError errorDetails)
            : base(errorDetails.Message)
        {
            ErrorDetails = errorDetails;
        }
    }
}
