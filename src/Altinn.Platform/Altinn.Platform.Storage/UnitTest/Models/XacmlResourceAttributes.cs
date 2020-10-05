using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Platform.Storage.Models
{
    public class XacmlResourceAttributes
    {
        /// <summary>
        /// Gets or sets the value for org attribute
        /// </summary>
        public string OrgValue { get; set; }

        /// <summary>
        /// Gets or sets the value for app attribute
        /// </summary>
        public string AppValue { get; set; }

        /// <summary>
        /// Gets or sets the value for instance attribute
        /// </summary>
        public string InstanceValue { get; set; }

        /// <summary>
        /// Gets or sets the value for resourceparty attribute
        /// </summary>
        public string ResourcePartyValue { get; set; }

        /// <summary>
        /// Gets or sets the value for task attribute
        /// </summary>
        public string TaskValue { get; set; }

        /// <summary>
        /// Gets or sets the value for app resource. 
        /// </summary>
        public string AppResourceValue { get; set; }
    }
}
