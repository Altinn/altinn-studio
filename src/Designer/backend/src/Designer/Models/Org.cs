using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.ResourceRegistry.Core.Models
{
    /// <summary>
    /// Describes an organization
    /// </summary>
    public class Org
    {
        /// <summary>
        /// Name of organization. With lanugage support
        /// </summary>
        [JsonProperty("name")]
        public Dictionary<string, string> Name { get; set; }

        /// <summary>
        /// The logo
        /// </summary>
        public string Logo { get; set; }

        /// <summary>
        /// The organization number
        /// </summary>
        public string Orgnr { get; set; }

        /// <summary>
        /// The homepage
        /// </summary>
        public string Homepage { get; set; }

        /// <summary>
        /// The environments available for the organzation
        /// </summary>
        public List<string> Environments { get; set; }
    }
}
