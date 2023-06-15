using System.Runtime.Serialization;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    [DataContract]
    public class CommitAffectedFile
    {
        [JsonProperty("filename")]
        public string Filename { get; set; }
    }
}
