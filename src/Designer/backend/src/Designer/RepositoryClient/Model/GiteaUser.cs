using System.Runtime.Serialization;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    [DataContract]
    public class GiteaUser
    {
        [JsonProperty("active")]
        public bool Active { get; set; }

        [JsonProperty("avatar_url")]
        public string AvatarUrl { get; set; }

        [JsonProperty("created")]
        public string Created { get; set; }

        [JsonProperty("description")]
        public string Description { get; set; }

        [JsonProperty("email")]
        public string Email { get; set; }

        [JsonProperty("following_count")]
        public int FollowingCount { get; set; }

        [JsonProperty("full_name")]
        public string FullName { get; set; }

        [JsonProperty("id")]
        public int Id { get; set; }

        [JsonProperty("is_admin")]
        public bool IsAdmin { get; set; }

        [JsonProperty("language")]
        public string Language { get; set; }

        [JsonProperty("last_login")]
        public string LastLogin { get; set; }

        [JsonProperty("location")]
        public string Location { get; set; }

        [JsonProperty("login")]
        public string Login { get; set; }

        [JsonProperty("login_name")]
        public string LoginName { get; set; }

        [JsonProperty("prohibit_login")]
        public bool ProhibitLogin { get; set; }

        [JsonProperty("restricted")]
        public bool Restricted { get; set; }

        [JsonProperty("starred_repos_count")]
        public int StarredReposCount { get; set; }

        [JsonProperty("visibility")]
        public string Visibility { get; set; }

        [JsonProperty("website")]
        public string WebSite { get; set; }
    }
}
