#nullable disable
using System.Runtime.Serialization;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    [DataContract]
    public class GiteaRepoCommitUser
    {
        [JsonProperty("date")]
        public string Date { get; set; }

        [JsonProperty("email")]
        public string Email { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }
    }
}
