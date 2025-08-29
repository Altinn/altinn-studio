using System.Runtime.Serialization;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    [DataContract]
    public class GiteaRepoPayloadCommitVerification
    {
        [JsonProperty("payload")]
        public string Payload { get; set; }

        [JsonProperty("reason")]
        public string Reason { get; set; }

        [JsonProperty("signature")]
        public string Signature { get; set; }

        [JsonProperty("signer")]
        public GiteaRepoPayloadUser Signer { get; set; }

        [JsonProperty("verified")]
        public bool Verified { get; set; }
    }
}
