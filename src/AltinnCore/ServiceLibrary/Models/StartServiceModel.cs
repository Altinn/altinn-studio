using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Model containing all information needed to instantiate a service
    /// </summary>
    public class StartServiceModel
    {
        /// <summary>
        /// Gets or sets the ID of the reportee that the service should be instantiated on behalf of
        /// </summary>
        public int ReporteeID { get; set; }
        
        /// <summary>
        /// Gets or sets the ID of the user that is instantiating the service
        /// </summary>
        public int UserID { get; set; }
        
        /// <summary>
        /// Gets or sets the ID of the service that should be instantiated
        /// </summary>
        public string ServiceID { get; set; }

        /// <summary>
        /// Gets or sets the key of the prefill to use when instantiating the service (optional)
        /// </summary>
        public string PrefillKey { get; set; }

        /// <summary>
        /// Gets or sets a list of reportees that are available when instantiating
        /// </summary>
        public List<SelectListItem> ReporteeList { get; set; }

        /// <summary>
        /// Gets or sets a list of available prefill for the active service
        /// </summary>
        public List<SelectListItem> PrefillList { get; set; }

        /// <summary>
        /// Gets or sets the organization the current service belongs to
        /// </summary>
        public string Org { get; set; }

        /// <summary>
        /// Gets or sets the name of the service being instantiated
        /// </summary>
        public string Service { get; set; }
    }
}
