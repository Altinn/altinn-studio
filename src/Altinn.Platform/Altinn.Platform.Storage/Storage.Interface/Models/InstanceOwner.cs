using System;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Model to hold a instance owner element.
    /// </summary>
    [Serializable]
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class InstanceOwner
    {
        /// <summary>
        /// The party id of the instance owner (also called instance owner party id). 
        /// </summary>
        [JsonProperty(PropertyName = "partyId")]
        public string PartyId { get; set; }

        /// <summary>
        /// Person number (national identification number). Null if the party is an org.
        /// </summary>
        [JsonProperty(PropertyName = "personNumber")]
        public string PersonNumber { get; set; }

        /// <summary>
        /// organisation number party represents an organisation. Null if the party is a person.
        /// </summary>
        [JsonProperty(PropertyName = "organisationNumber")]
        public string OrganisationNumber { get; set; }

    }
}
