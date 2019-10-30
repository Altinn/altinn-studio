using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model to hold a data element.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class DataElement : ChangableElement
    {
        /// <summary>
        /// data id, an guid.
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// The instance id which the data element belongs to. 
        /// </summary>
        [JsonProperty(PropertyName = "instanceId")]
        public string instanceId;

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
        /// path to blob storage. Might be nullified in export.
        /// </summary>
        [JsonProperty(PropertyName = "blobStoragePath")]
        public string BlobStoragePath { get; set; }

        /// <summary>
        /// Links to access the data elements
        /// </summary>
        [JsonProperty(PropertyName = "selfLinks")]
        public ResourceLinks SelfLinks { get; set; }

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
        /// Holds information about when the application owner has downloaded and confirmed download of the element.
        /// </summary>
        [JsonProperty(PropertyName  = "appOwner")]
        public ApplicationOwnerDataState AppOwner;

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}
