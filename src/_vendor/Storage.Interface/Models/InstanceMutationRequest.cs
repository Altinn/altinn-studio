#nullable disable

using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Request body for committing Storage-visible mutations for one instance.
/// </summary>
public class InstanceMutationRequest
{
    /// <summary>
    /// Data elements to create. Each item that uploads content references a multipart file part by name.
    /// </summary>
    [JsonProperty(PropertyName = "createDataElements")]
    public List<InstanceMutationCreateDataElement> CreateDataElements { get; set; }

    /// <summary>
    /// Existing data elements to update.
    /// </summary>
    [JsonProperty(PropertyName = "updateDataElements")]
    public List<InstanceMutationUpdateDataElement> UpdateDataElements { get; set; }

    /// <summary>
    /// Existing data elements to delete immediately from Storage metadata.
    /// </summary>
    [JsonProperty(PropertyName = "deleteDataElements")]
    public List<InstanceMutationDeleteDataElement> DeleteDataElements { get; set; }

    /// <summary>
    /// Optional hard-delete operation for the instance itself.
    /// </summary>
    [JsonProperty(PropertyName = "deleteInstance")]
    public InstanceMutationDeleteInstance DeleteInstance { get; set; }

    /// <summary>
    /// DataValues entries to merge into the instance. Null or empty values remove keys.
    /// </summary>
    [JsonProperty(PropertyName = "dataValues")]
    public Dictionary<string, string> DataValues { get; set; }

    /// <summary>
    /// PresentationTexts entries to merge into the instance. Null or empty values remove keys.
    /// </summary>
    [JsonProperty(PropertyName = "presentationTexts")]
    public Dictionary<string, string> PresentationTexts { get; set; }

    /// <summary>
    /// Optional process state and instance events to persist with the aggregate mutation.
    /// </summary>
    [JsonProperty(PropertyName = "processState")]
    public ProcessStateUpdate ProcessState { get; set; }
}

/// <summary>
/// Create-data-element operation inside an instance mutation request.
/// </summary>
public class InstanceMutationCreateDataElement
{
    /// <summary>
    /// Data type id from application metadata.
    /// </summary>
    [JsonProperty(PropertyName = "dataType")]
    public string DataType { get; set; }

    /// <summary>
    /// Multipart file part name containing the blob content for this data element.
    /// The part must appear exactly once in the multipart body, and two operations may not share the same contentPartName.
    /// </summary>
    [JsonProperty(PropertyName = "contentPartName")]
    public string ContentPartName { get; set; }

    /// <summary>
    /// Optional content type override. When omitted, Storage uses the multipart part content type.
    /// </summary>
    [JsonProperty(PropertyName = "contentType")]
    public string ContentType { get; set; }

    /// <summary>
    /// Optional filename override. When omitted, Storage uses the multipart part filename.
    /// </summary>
    [JsonProperty(PropertyName = "filename")]
    public string Filename { get; set; }

    /// <summary>
    /// Optional data element references.
    /// </summary>
    [JsonProperty(PropertyName = "refs")]
    public List<Guid> Refs { get; set; }

    /// <summary>
    /// Optional task id this data element was generated from.
    /// </summary>
    [JsonProperty(PropertyName = "generatedFromTask")]
    public string GeneratedFromTask { get; set; }

    /// <summary>
    /// Optional metadata to store on the created data element.
    /// </summary>
    [JsonProperty(PropertyName = "metadata")]
    public List<KeyValueEntry> Metadata { get; set; }

    /// <summary>
    /// Optional user-defined metadata to store on the created data element.
    /// </summary>
    [JsonProperty(PropertyName = "userDefinedMetadata")]
    public List<KeyValueEntry> UserDefinedMetadata { get; set; }

    /// <summary>
    /// Optional tags to store on the created data element.
    /// </summary>
    [JsonProperty(PropertyName = "tags")]
    public List<string> Tags { get; set; }

    /// <summary>
    /// Optional initial locked flag.
    /// </summary>
    [JsonProperty(PropertyName = "locked")]
    public bool? Locked { get; set; }
}

/// <summary>
/// Update-data-element operation inside an instance mutation request.
/// </summary>
public class InstanceMutationUpdateDataElement
{
    /// <summary>
    /// Data element id to update.
    /// </summary>
    [JsonProperty(PropertyName = "dataElementId")]
    public Guid DataElementId { get; set; }

    /// <summary>
    /// Optional multipart file part name containing replacement blob content.
    /// When supplied, the part must appear exactly once in the multipart body, and two operations may not share the same contentPartName.
    /// </summary>
    [JsonProperty(PropertyName = "contentPartName")]
    public string ContentPartName { get; set; }

    /// <summary>
    /// Optional expected current blob version id for the data element content fence.
    /// </summary>
    [JsonProperty(PropertyName = "expectedCurrentBlobVersion")]
    public string ExpectedCurrentBlobVersion { get; set; }

    /// <summary>
    /// Optional content type override when replacement content is supplied.
    /// </summary>
    [JsonProperty(PropertyName = "contentType")]
    public string ContentType { get; set; }

    /// <summary>
    /// Optional filename override when replacement content is supplied.
    /// </summary>
    [JsonProperty(PropertyName = "filename")]
    public string Filename { get; set; }

    /// <summary>
    /// Optional replacement refs.
    /// </summary>
    [JsonProperty(PropertyName = "refs")]
    public List<Guid> Refs { get; set; }

    /// <summary>
    /// Optional task id this data element was generated from.
    /// </summary>
    [JsonProperty(PropertyName = "generatedFromTask")]
    public string GeneratedFromTask { get; set; }

    /// <summary>
    /// Optional replacement metadata.
    /// </summary>
    [JsonProperty(PropertyName = "metadata")]
    public List<KeyValueEntry> Metadata { get; set; }

    /// <summary>
    /// Optional replacement user-defined metadata.
    /// </summary>
    [JsonProperty(PropertyName = "userDefinedMetadata")]
    public List<KeyValueEntry> UserDefinedMetadata { get; set; }

    /// <summary>
    /// Optional replacement tags.
    /// </summary>
    [JsonProperty(PropertyName = "tags")]
    public List<string> Tags { get; set; }

    /// <summary>
    /// Optional replacement delete status.
    /// </summary>
    [JsonProperty(PropertyName = "deleteStatus")]
    public DeleteStatus DeleteStatus { get; set; }

    /// <summary>
    /// Optional replacement locked flag.
    /// </summary>
    [JsonProperty(PropertyName = "locked")]
    public bool? Locked { get; set; }
}

/// <summary>
/// Delete-data-element operation inside an instance mutation request.
/// </summary>
public class InstanceMutationDeleteDataElement
{
    /// <summary>
    /// Data element id to delete immediately from Storage metadata.
    /// </summary>
    [JsonProperty(PropertyName = "dataElementId")]
    public Guid DataElementId { get; set; }

    /// <summary>
    /// Whether to delete the data element even when it is locked.
    /// </summary>
    [JsonProperty(PropertyName = "ignoreLock")]
    public bool IgnoreLock { get; set; }
}

/// <summary>
/// Delete-instance operation inside an instance mutation request.
/// </summary>
public class InstanceMutationDeleteInstance
{
    /// <summary>
    /// Whether to mark the instance as hard-deleted.
    /// </summary>
    [JsonProperty(PropertyName = "hard")]
    public bool Hard { get; set; }
}
