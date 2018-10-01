using System.Collections.Generic;

namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Class containing information about the result of a service validation (single element)
    /// </summary>
    public class ValidationResult
    {
        /// <summary>
        /// Gets or sets the validation group
        /// </summary>
        public string ValidationGroup { get; set; }

        /// <summary>
        /// Gets or sets the model key
        /// </summary>
        public string ModelKey { get; set; }

        /// <summary>
        /// Gets or sets the resource key of the validation message
        /// </summary>
        public string ValidationMessageKey { get; set; }

        /// <summary>
        /// Gets or sets the <see cref="ValidationStatusType"/>
        /// </summary>
        public ValidationStatusType ValidationStatusType { get; set; }

        /// <summary>
        /// Gets or sets the id of the view to display
        /// </summary>
        public string ViewID { get; set; }

        /// <summary>
        /// Gets or sets the item ID, used to handle repeating groups and fields
        /// </summary>
        public int ItemID { get; set; }

        /// <summary>
        /// Gets or sets all custom parameters included in the request
        /// </summary>
        public Dictionary<string, string> CustomParameters { get; set; }

        /// <summary>
        /// Gets or sets parameters to use in the validation message
        /// </summary>
        public List<string> MessageParams { get; set; }
    }
}
