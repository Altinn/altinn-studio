using System;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Repository.Models
{
    /// <summary>
    /// Base class for entities in a db
    /// </summary>
    public class BaseEntity
    {
        /// <summary>
        /// Created
        /// </summary>
        [JsonProperty("created")]
        public DateTime Created { get; set; }

        /// <summary>
        /// CreatedBy
        /// </summary>
        [JsonProperty("createdBy")]
        public string CreatedBy { get; set; }

        /// <summary>
        /// Application name
        /// </summary>
        [JsonProperty("app")]
        public string App { get; set; }

        /// <summary>
        /// Organisation name
        /// </summary>
        [JsonProperty("org")]
        public string Org { get; set; }
    }
}
