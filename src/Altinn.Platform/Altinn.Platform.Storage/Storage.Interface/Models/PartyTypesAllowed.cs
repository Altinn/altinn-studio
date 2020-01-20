using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents an set of settings where application owner can define what types of parties
    /// that are allowed to instantiate an application.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class PartyTypesAllowed
    {
        /// <summary>
        /// Gets or sets a value indicating whether a bankruptcy estate is allowed to instantiate.
        /// </summary>
        [JsonProperty(PropertyName = "bankruptcyEstate")]
        public bool BankruptcyEstate { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether an organisation is allowed to instantiate.
        /// </summary>
        [JsonProperty(PropertyName = "organisation")]
        public bool Organisation { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether a person is allowed to instantiate.
        /// </summary>
        [JsonProperty(PropertyName = "person")]
        public bool Person { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether a sub unit is allowed to instantiate.
        /// </summary>
        [JsonProperty(PropertyName = "subUnit")]
        public bool SubUnit { get; set; }
    }
}
