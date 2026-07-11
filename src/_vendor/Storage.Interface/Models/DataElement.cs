#nullable disable

using System;
using System.Collections.Generic;
using Altinn.Platform.Storage.Interface.Enums;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using TextJson = System.Text.Json.Serialization;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Represents metadata about a data element.
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class DataElement : ChangableElement
{
    /// <summary>
    /// Gets or sets the unique id, a guid.
    /// </summary>
    [JsonProperty(PropertyName = "id")]
    public string Id { get; set; }

    /// <summary>
    /// Gets or sets the id of the instance which the data element belongs to.
    /// This field is normally not populated if data element is part of instance metadata.
    /// </summary>
    [JsonProperty(PropertyName = "instanceGuid")]
    public string InstanceGuid { get; set; }

    /// <summary>
    /// Gets or sets the data type, must be equal to the ones defined in application data types.
    /// </summary>
    [JsonProperty(PropertyName = "dataType")]
    public string DataType { get; set; }

    /// <summary>
    /// Gets or sets the name of the data element (file)
    /// </summary>
    [JsonProperty(PropertyName = "filename")]
    public string Filename { get; set; }

    /// <summary>
    /// Gets or sets the content type in the stored data element (file).
    /// </summary>
    [JsonProperty(PropertyName = "contentType")]
    public string ContentType { get; set; }

    /// <summary>
    /// Gets or sets the current path to blob storage. Might be nullified in export.
    /// </summary>
    [JsonProperty(PropertyName = "blobStoragePath")]
    public string BlobStoragePath { get; set; }

    /// <summary>
    /// Gets or sets links to access the data element.
    /// </summary>
    [JsonProperty(PropertyName = "selfLinks")]
    public ResourceLinks SelfLinks { get; set; }

    /// <summary>
    /// Gets or sets the size of file in bytes
    /// </summary>
    [JsonProperty(PropertyName = "size")]
    public long Size { get; set; }

    /// <summary>
    /// Gets or sets the computed MD5 hash value of the blob. (Base64 encoded string, not the more common hex encoding)
    /// </summary>
    [JsonProperty(PropertyName = "contentHash")]
    public string ContentHash { get; set; }

    /// <summary>
    /// Gets or sets the current entity tag of the data element content, as a quoted strong HTTP ETag.
    /// </summary>
    /// <remarks>
    /// The value matches the ETag response header on content downloads and can be sent verbatim in
    /// If-Match headers on content reads and updates. It versions the content only: metadata-only
    /// updates (tags, read status, lock status) do not change it. Null for elements whose content
    /// is not stored with a blob version, such as on-demand elements.
    /// </remarks>
    [JsonProperty(PropertyName = "contentEtag")]
    public string ContentEtag { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the element can be updated.
    /// </summary>
    [JsonProperty(PropertyName = "locked")]
    public bool Locked { get; set; }

    /// <summary>
    /// Gets or sets an optional array of data element references.
    /// </summary>
    [JsonProperty(PropertyName = "refs")]
    public List<Guid> Refs { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the element has been read.
    /// </summary>
    [JsonProperty(PropertyName = "isRead")]
    public bool IsRead { get; set; } = true;

    /// <summary>
    /// Gets or sets a collection of tags associated with the data element.
    /// </summary>
    [JsonProperty(PropertyName = "tags")]
    public List<string> Tags { get; set; } = new List<string>();

    /// <summary>
    /// Gets or sets user-defined metadata associated with the data element.
    /// </summary>
    /// <remarks>
    /// Changeable by the end user, like tags, and is not suitable to store system-controlled metadata.
    /// </remarks>
    [JsonProperty(PropertyName = "userDefinedMetadata")]
    public List<KeyValueEntry> UserDefinedMetadata { get; set; }

    /// <summary>
    /// Gets or sets application-defined metadata associated with the data element.
    /// </summary>
    /// <remarks>
    ///  Meant to be used in custom backend code. This field should not be changeable by the end user.
    /// </remarks>
    [JsonProperty(PropertyName = "metadata")]
    public List<KeyValueEntry> Metadata { get; set; }

    /// <summary>
    /// Gets or sets the delete status of the data element.
    /// </summary>
    [JsonProperty(PropertyName = "deleteStatus")]
    public DeleteStatus DeleteStatus { get; set; }

    /// <summary>
    /// Gets or sets the result of a file scan of the blob represented by this data element.
    /// </summary>
    [JsonProperty(PropertyName = "fileScanResult")]
    [JsonConverter(typeof(StringEnumConverter))]
    [TextJson.JsonConverter(typeof(TextJson.JsonStringEnumConverter))]
    public FileScanResult FileScanResult { get; set; }

    /// <summary>
    /// Gets or sets the list of references to other objects.
    /// </summary>
    [JsonProperty(PropertyName = "references")]
    public List<Reference> References { get; set; }

    /// <inheritdoc/>
    public override string ToString()
    {
        return JsonConvert.SerializeObject(this);
    }

    /// <summary>
    /// Sets platform self links for the data element.
    /// </summary>
    /// <param name="storageHostAndBase">The host and base path for platform storage. E.g. 'at22.altinn.cloud/storage/api/v1/'. Must end with '/'.</param>
    /// <param name="instanceOwnerPartyId">The instance owner party id.</param>
    public void SetPlatformSelfLinks(string storageHostAndBase, int instanceOwnerPartyId)
    {
        if (SelfLinks == null)
        {
            SelfLinks = new ResourceLinks();
        }

        SelfLinks.Platform =
            $"https://platform.{storageHostAndBase}instances/{instanceOwnerPartyId}/{InstanceGuid}/data/{Id}";
    }
}

/// <summary>
/// Represents a container object with a list of data elements.
/// </summary>
/// <remarks>
/// This should be used only when an API endpoint would otherwise return a list of data elements.
/// Not when the list is a property of a separate class.
/// </remarks>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class DataElementList
{
    /// <summary>
    /// The actual list of data elements.
    /// </summary>
    [JsonProperty(PropertyName = "dataElements")]
    public List<DataElement> DataElements { get; set; }
}

/// <summary>
/// Represents a key-value pair.
/// </summary>
public class KeyValueEntry
{
    /// <summary>
    /// The key. Must be unique within the list.
    /// </summary>
    [JsonProperty(PropertyName = "key")]
    public string Key { get; set; }

    /// <summary>
    /// The value.
    /// </summary>
    [JsonProperty(PropertyName = "value")]
    public string Value { get; set; }
}
