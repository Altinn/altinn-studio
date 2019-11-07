using System;
using System.Collections.Generic;
using Newtonsoft.Json;


namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Model to hold metadata about a data type element.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class DataElement : ChangableElement
    {
        /// <summary>
        /// The data element id, a guid.
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// The guid of the instance which the data element belongs to. This field is normally not populated if data element is part of instance metadata.
        /// </summary>
        [JsonProperty(PropertyName = "instanceGuid")]
        public string instanceGuid;

        /// <summary>
        /// the data type, must be equal to the ones defined in application data types.
        /// </summary>
        [JsonProperty(PropertyName = "dataType")]
        public string DataType { get; set; }

        /// <summary>
        /// the name of the data element (file)
        /// </summary>
        [JsonProperty(PropertyName = "filename")]
        public string Filename { get; set; }

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
        [JsonProperty(PropertyName = "size")]
        public long Size { get; set; }

        /// <summary>
        /// Indicates that element cannot be updated
        /// </summary>
        [JsonProperty(PropertyName = "locked")]
        public bool Locked { get; set; }

        /// <summary>
        /// Holds information about when the application owner has downloaded and confirmed download of the element.
        /// </summary>
        [JsonProperty(PropertyName  = "appOwner")]
        public ApplicationOwnerDataState AppOwner;

        /// <summary>
        /// an optional array of data element references.
        /// </summary>
        [JsonProperty(PropertyName = "refs")]
        public List<Guid> Refs { get; set; }

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}
