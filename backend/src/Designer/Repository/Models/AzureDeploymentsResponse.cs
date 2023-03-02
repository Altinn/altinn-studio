using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Repository.Models
{

    public class AzureDeploymentsResponse
    {
        public List<Deployment> Deployment { get; set; }
    }

    public class Deployment
    {
        [JsonPropertyName("release")]
        public string Release { get; set; }
        [JsonPropertyName("version")]
        public string Version { get; set; }
    }
}
