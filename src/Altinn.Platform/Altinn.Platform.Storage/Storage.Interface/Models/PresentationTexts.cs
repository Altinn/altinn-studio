using System.Collections.Generic;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents the body of a PUT request against the presentationtexts endpoint for Instance.
    /// </summary>
    public class PresentationTexts
    {
        /// <summary>
        /// The actual collection of texts to be added to 
        /// </summary>
        [JsonProperty(PropertyName = "texts")]
        public Dictionary<string, string> Texts { get; set; }
    }
}
