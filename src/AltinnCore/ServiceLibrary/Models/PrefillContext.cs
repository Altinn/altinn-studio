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
        /// Gets or sets the users SSN
        /// </summary>
        public string SSN { get; set; }

        /// <summary>
        /// Gets or sets the organization number
        /// </summary>
        public string OrgNumber { get; set; }

        /// <summary>
        /// Gets or sets the userid
        /// </summary>
        public int UserId { get; set; }
    }
}
