using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model for the different party types which are allowed to instantiate an application
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class PartyTypesAllowed
    {
        /// <summary>
        /// Should a bankruptcy estate be allowed to instantiate
        /// </summary>
        [JsonProperty(PropertyName = "bankruptcyEstate")]
        public bool BankruptcyEstate { get; set; }

        /// <summary>
        /// Should a organization be allowed to instantiate
        /// </summary>
        [JsonProperty(PropertyName = "organization")]
        public bool Organization { get; set; }

        /// <summary>
        /// Should a person be allowed to instantiate
        /// </summary>
        [JsonProperty(PropertyName = "person")]
        public bool Person { get; set; }

        /// <summary>
        /// Should a sub unit be allowed to instantiate
        /// </summary>
        [JsonProperty(PropertyName = "subUnit")]
        public bool SubUnit { get; set; }
    }
}
