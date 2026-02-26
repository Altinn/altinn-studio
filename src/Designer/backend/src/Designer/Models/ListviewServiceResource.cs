using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class ListviewServiceResource
    {
        /// <summary>
        /// The identifier of the resource
        /// </summary>
        public string? Identifier { get; set; }

        /// <summary>
        /// The title of service
        /// </summary>
        public Dictionary<string, string>? Title { get; set; }

        /// <summary>
        /// The user who created the resource
        /// </summary>
        public string? CreatedBy { get; set; }

        /// <summary>
        /// Timestamp for when the resource file was last changed
        /// </summary>
        public DateTime? LastChanged { get; set; }

        /// <summary>
        /// A bool indicating if the resource has a policy or not
        /// </summary>
        public bool? HasPolicy { get; set; }

        /// <summary>
        /// A list of environments the resource is deployed in
        /// </summary>
        public IList<string>? Environments { get; set; }
    }
}
