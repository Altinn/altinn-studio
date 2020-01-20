using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Infrastructure.Authentication
{
    /// <summary>
    /// Access token model
    /// </summary>
    public class AccessTokenModel
    {
        /// <summary>
        /// Access token
        /// </summary>
        [JsonProperty("access_token")]
        public string AccessToken { get; set; }

        /// <summary>
        /// Scope of the token
        /// </summary>
        [JsonProperty("scope")]
        public string Scope { get; set; }
    }
}
