using System.Collections.Generic;

namespace AltinnCore.ServiceLibrary.Api
{
    /// <summary>
    /// Defines a model state entry for a given key
    /// </summary>
    public class ApiModelStateEntry
    {
        /// <summary>
        /// Gets or sets the Key
        /// </summary>
        public string Key { get; set; }

        /// <summary>
        /// Gets or sets the list of errors
        /// </summary>
        public List<ApiModelError> Errors { get; set; }

        /// <summary>
        /// Gets or sets a validation state for a given model key
        /// </summary>
        public ApiModelValidationState ValidationState { get; set; }
    }
}
