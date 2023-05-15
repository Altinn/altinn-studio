namespace Altinn.App.Core.Models
{
    /// <summary>
    /// Class representing the result of a process change
    /// </summary>
    public class ProcessChangeResult
    {
        /// <summary>
        /// Gets or sets a value indicating whether the process change was successful
        /// </summary>
        public bool Success { get; set; }
        /// <summary>
        /// Gets or sets the error message if the process change was not successful
        /// </summary>
        public string? ErrorMessage { get; set; }
        /// <summary>
        /// Gets or sets the error type if the process change was not successful
        /// </summary>
        public ProcessErrorType? ErrorType { get; set; }
        
        /// <summary>
        /// Gets or sets the process state change if the process change was successful
        /// </summary>
        public ProcessStateChange? ProcessStateChange { get; set; }
    }

    /// <summary>
    /// Types of errors that can occur during a process change
    /// </summary>
    public enum ProcessErrorType
    {
        /// <summary>
        /// The process change was not allowed due to the current state of the process
        /// </summary>
        Conflict
    }
}
