#nullable disable

using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

public class InstanceMutationRequest
{
    [JsonProperty(PropertyName = "createDataElements")]
    public List<InstanceMutationCreateDataElement> CreateDataElements { get; set; }

    [JsonProperty(PropertyName = "updateDataElements")]
    public List<InstanceMutationUpdateDataElement> UpdateDataElements { get; set; }

    [JsonProperty(PropertyName = "deleteDataElements")]
    public List<InstanceMutationDeleteDataElement> DeleteDataElements { get; set; }

    [JsonProperty(PropertyName = "deleteInstance")]
    public InstanceMutationDeleteInstance DeleteInstance { get; set; }

    [JsonProperty(PropertyName = "dataValues")]
    public Dictionary<string, string> DataValues { get; set; }

    [JsonProperty(PropertyName = "presentationTexts")]
    public Dictionary<string, string> PresentationTexts { get; set; }

    [JsonProperty(PropertyName = "processState")]
    public ProcessStateUpdate ProcessState { get; set; }
}

public class InstanceMutationCreateDataElement
{
    [JsonProperty(PropertyName = "dataType")]
    public string DataType { get; set; }

    [JsonProperty(PropertyName = "contentPartName")]
    public string ContentPartName { get; set; }

    [JsonProperty(PropertyName = "contentType")]
    public string ContentType { get; set; }

    [JsonProperty(PropertyName = "filename")]
    public string Filename { get; set; }

    [JsonProperty(PropertyName = "refs")]
    public List<Guid> Refs { get; set; }

    [JsonProperty(PropertyName = "generatedFromTask")]
    public string GeneratedFromTask { get; set; }

    [JsonProperty(PropertyName = "metadata")]
    public List<KeyValueEntry> Metadata { get; set; }

    [JsonProperty(PropertyName = "userDefinedMetadata")]
    public List<KeyValueEntry> UserDefinedMetadata { get; set; }

    [JsonProperty(PropertyName = "tags")]
    public List<string> Tags { get; set; }

    [JsonProperty(PropertyName = "locked")]
    public bool? Locked { get; set; }
}

public class InstanceMutationUpdateDataElement
{
    [JsonProperty(PropertyName = "dataElementId")]
    public Guid DataElementId { get; set; }

    [JsonProperty(PropertyName = "contentPartName")]
    public string ContentPartName { get; set; }

    [JsonProperty(PropertyName = "expectedCurrentBlobVersion")]
    public string ExpectedCurrentBlobVersion { get; set; }

    [JsonProperty(PropertyName = "contentType")]
    public string ContentType { get; set; }

    [JsonProperty(PropertyName = "filename")]
    public string Filename { get; set; }

    [JsonProperty(PropertyName = "refs")]
    public List<Guid> Refs { get; set; }

    [JsonProperty(PropertyName = "generatedFromTask")]
    public string GeneratedFromTask { get; set; }

    [JsonProperty(PropertyName = "metadata")]
    public List<KeyValueEntry> Metadata { get; set; }

    [JsonProperty(PropertyName = "userDefinedMetadata")]
    public List<KeyValueEntry> UserDefinedMetadata { get; set; }

    [JsonProperty(PropertyName = "tags")]
    public List<string> Tags { get; set; }

    [JsonProperty(PropertyName = "deleteStatus")]
    public DeleteStatus DeleteStatus { get; set; }

    [JsonProperty(PropertyName = "locked")]
    public bool? Locked { get; set; }
}

public class InstanceMutationDeleteDataElement
{
    [JsonProperty(PropertyName = "dataElementId")]
    public Guid DataElementId { get; set; }

    [JsonProperty(PropertyName = "ignoreLock")]
    public bool IgnoreLock { get; set; }
}

public class InstanceMutationDeleteInstance
{
    [JsonProperty(PropertyName = "hard")]
    public bool Hard { get; set; }
}
