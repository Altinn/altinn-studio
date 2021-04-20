using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents the body of a PUT request against the data values endpoint for Instance.    
    /// </summary>
    public class DataValues
    {
        /// <summary>
        /// The actual collection of values to be added to.
        /// </summary>
        [JsonProperty(PropertyName = "values")]
        public Dictionary<string, string> Values { get; set; }
    }
}
