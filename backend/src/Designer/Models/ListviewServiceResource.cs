#nullable enable
using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Enums;

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
        /// Timestamp for when the resourcefile was last changed
        /// </summary>
        public DateTime LastChanged { get; set; }

        /// <summary>
        /// A bool indicating if the resource has a policy or not
        /// </summary>
        public bool? HasPolicy { get; set; }
    }
}
