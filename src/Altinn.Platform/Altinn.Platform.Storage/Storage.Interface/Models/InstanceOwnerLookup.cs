using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Storage.Interface.Models;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model to hold a instance owner lookup element
    /// </summary>
    [Serializable]
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class InstanceOwnerLookup
    {
        /// <summary>
        /// Person number (national identification number)
        /// </summary>
        [JsonProperty(PropertyName = "personNumber")]
        public string PersonNumber { get; set; }

        /// <summary>
        /// organisation number
        /// </summary>
        [JsonProperty(PropertyName = "organisationNumber")]
        public string OrganisationNumber { get; set; }

        /// <summary>
        /// user name
        /// </summary>
        [JsonProperty(PropertyName = "userName")]
        public string UserName { get; set; }
    }
}
