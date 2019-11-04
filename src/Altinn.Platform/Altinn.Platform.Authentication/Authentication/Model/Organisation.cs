using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Platform.Authentication.Model
{
    /// <summary>
    /// An organisation class to represent important information.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class Organisation
    {
        /// <summary>
        /// Organisation name, represented as a dictionary, where the key is the 2-letter language code and the value is the name in that language. 
        /// </summary>
        [JsonProperty(PropertyName = "name")]
        public Dictionary<string, string> Name { get; set; }

        /// <summary>
        /// Url to organisation logo.
        /// </summary>
        [JsonProperty(PropertyName = "logo")]
        public string Logo { get; set; }

        /// <summary>
        /// The organisation's official identity tag in Altinn. Abbreviation of organistion name.
        /// </summary>
        [JsonProperty(PropertyName = "org")]
        public string Org { get; set; }

        /// <summary>
        /// The organisation's official identity number according to the Central Coordinating Registry for Legal Entities (Enhetsregisteret).
        /// </summary>
        [JsonProperty(PropertyName = "orgnr")]
        public string OrgNumber { get; set; }

        /// <summary>
        /// Url to homepage.
        /// </summary>
        [JsonProperty(PropertyName = "homepage")]
        public string HomePage { get; set; }
    }
}
