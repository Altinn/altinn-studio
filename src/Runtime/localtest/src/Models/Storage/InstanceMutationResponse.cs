#nullable disable

using System.Collections.Generic;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.LocalTest.Models;

public class InstanceMutationResponse
{
    [JsonProperty(PropertyName = "instance")]
    public Instance Instance { get; set; }

    [JsonProperty(PropertyName = "createdDataElementIds")]
    public List<string> CreatedDataElementIds { get; set; }

    [JsonProperty(PropertyName = "replayed")]
    public bool Replayed { get; set; }

    [JsonProperty(PropertyName = "dataElementContentEtags")]
    public Dictionary<string, string> DataElementContentEtags { get; set; }
}
