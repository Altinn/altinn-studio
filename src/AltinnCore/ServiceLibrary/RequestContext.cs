using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Class containing the context / information about a request
    /// </summary>
    public class RequestContext
    {
        /// <summary>
        /// Gets or sets a list of all parameters included in the given request
        /// </summary>
        public Dictionary<string, string> Params { get; set; }

        /// <summary>
        /// Gets or sets the current user context
        /// </summary>
        public UserContext UserContext { get; set; }

        /// <summary>
        /// Gets or sets the current reportee
        /// </summary>
        public Party Reportee { get; set; }

        /// <summary>
        /// Gets or sets the validation result for this request
        /// </summary>
        public List<ValidationResult> ValidationResult { get; set; }

        /// <summary>
        /// Gets or sets the service instance id for this request
        /// </summary>
        public int InstanceId { get; set; }

        /// <summary>
        /// Gets or sets the form collection available 
        /// </summary>
        public IFormCollection Form { get; set; }

        /// <summary>
        /// Gets or sets a value indicating if the client need to updated
        /// </summary>
        public bool RequiresClientSideReleoad { get; set; }

        /// <summary>
        /// Gets or sets the field that triggered a single field validation
        /// </summary>
        public string ValidationTriggerField { get; set; }
    }
}
