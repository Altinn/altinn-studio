using System.Collections.Generic;

namespace AltinnCore.ServiceLibrary.Api
{
    /// <summary>
    /// Defines the validation result for a model state
    /// </summary>
    public class ApiValidationResult
    {
        /// <summary>
        /// Gets or sets the collection of errors
        /// </summary>
        public Dictionary<string, List<string>> Errors { get; set; }

        /// <summary>
        /// Gets or sets the collection of warnings
        /// </summary>
        public Dictionary<string, List<string>> Warnings { get; set; }
    }
}
