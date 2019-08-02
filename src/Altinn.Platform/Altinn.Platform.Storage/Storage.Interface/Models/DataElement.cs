using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Storage.Interface.Models;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model to hold a data element.
    /// </summary>
    [Serializable]
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class DataElement
    {
        /// <summary>
        /// data id, an guid.
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// the element type, must be equal to the ones defined in application element types.
        /// </summary>
        [JsonProperty(PropertyName = "elementType")]
        public string ElementType { get; set; }

        /// <summary>
        /// the name of the data element (file)
        /// </summary>
        [JsonProperty(PropertyName = "fileName")]
        public string FileName { get; set; }

        /// <summary>
        /// contentType of data element (file) stored
        /// </summary>
        [JsonProperty(PropertyName = "contentType")]
        public string ContentType { get; set; }

        /// <summary>
        /// path to blob storage
        /// </summary>
        [JsonProperty(PropertyName = "storageUrl")]
        public string StorageUrl { get; set; }

        /// <summary>
        /// Links to access the data elements
        /// </summary>
        [JsonProperty(PropertyName = "dataLinks")]
        public ResourceLinks DataLinks { get; set; }

        /// <summary>
        /// Size of file in bytes
        /// </summary>
        [JsonProperty(PropertyName = "fileSize")]
        public long FileSize { get; set; }

        /// <summary>
        /// Signature
        /// </summary>
        [JsonProperty(PropertyName = "signature")]
        public string Signature { get; set; }

        /// <summary>
        /// Indicates that the instance owner no longer can update the data element
        /// </summary>
        [JsonProperty(PropertyName = "isLocked")]
        public bool IsLocked { get; set; }

        /// <summary>
        /// create date and time for the data element
        /// </summary>
        [JsonProperty(PropertyName = "createdDateTime")]
        public DateTime CreatedDateTime { get; set; }

        /// <summary>
        /// user id of the user who created the data element
        /// </summary>
        [JsonProperty(PropertyName = "createdBy")]
        public string CreatedBy { get; set; }

        /// <summary>
        /// last changed date time for the data element
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedDateTime")]
        public DateTime? LastChangedDateTime { get; set; }

        /// <summary>
        /// user id of the user who last changed the instance
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedBy")]
        public string LastChangedBy { get; set; }
    }
}
