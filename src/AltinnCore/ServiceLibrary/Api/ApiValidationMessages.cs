using System.Collections.Generic;

namespace AltinnCore.ServiceLibrary.Api
{
    /// <summary>
    /// Defines the validation result for a model state
    /// </summary>
    public class ApiValidationMessages
    {
        /// <summary>
        /// Gets or sets the collection of errors
        /// </summary>
        public List<string> Errors { get; set; }

        /// <summary>
        /// Gets or sets the collection of warnings
        /// </summary>
        public List<string> Warnings { get; set; }
    }
}
