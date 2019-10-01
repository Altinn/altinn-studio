using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.ServiceLibrary.Models
{
    /// <summary>
    /// Class containing information for prefill 
    /// </summary>
    public class PrefillContext
    {
        /// <summary>
        /// Gets or sets the person
        /// </summary>
        public Person Person { get; set; }

        /// <summary>
        /// Gets or sets the organization 
        /// </summary>
        public Organization Organization { get; set; }

        /// <summary>
        /// Gets or sets the userid
        /// </summary>
        public int UserId { get; set; }

        /// <summary>
        /// Gets or sets the org name
        /// </summary>
        public string Org { get; set; }

        /// <summary>
        /// Gets or sets the app name
        /// </summary>
        public string App { get; set; }
    }
}
