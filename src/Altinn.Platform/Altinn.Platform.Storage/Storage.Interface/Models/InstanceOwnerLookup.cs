using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Storage.Interface.Models;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model to hold a data element
    /// </summary>
    [Serializable]
    public class InstanceOwnerLookup
    {
        /// <summary>
        /// Social security number
        /// </summary>
        [JsonProperty(PropertyName = "ssn")]
        public string Ssn { get; set; }

        /// <summary>
        /// organization number
        /// </summary>
        [JsonProperty(PropertyName = "organizationNumber")]
        public string ElementType { get; set; }

        /// <summary>
        /// user name
        /// </summary>
        [JsonProperty(PropertyName = "userName")]
        public string UserName { get; set; }
    }
}
