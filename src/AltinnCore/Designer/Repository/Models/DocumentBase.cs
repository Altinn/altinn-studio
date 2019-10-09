using System;
using Newtonsoft.Json;

namespace AltinnCore.Designer.Repository.Models
{
    /// <summary>
    /// Base class for Documents in DocumentDb
    /// </summary>
    public class DocumentBase
    {
        /// <summary>
        /// Id
        /// </summary>
        [JsonProperty("id")]
        public string Id { get; set; }

        /// <summary>
        /// Created
        /// </summary>
        [JsonProperty("created")]
        public DateTime Created { get; set; }

        /// <summary>
        /// CreatedBy
        /// </summary>
        [JsonProperty("created_by")]
        public string CreatedBy { get; set; }
    }
}
