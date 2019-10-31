using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Information about the platform user, that is the identity of the client doing the action and his/hers authentication level.
    /// It can be a person (UserId) or an organisation (OrgId). And the user can have logged in via an end user system or not.
    /// </summary>
    public class PlatformUser
    {
        /// <summary>
        /// The identifier of the user as given by Altinn, or null if the user is a organisation user.
        /// </summary>
        [JsonProperty(PropertyName = "userId")]
        public int? UserId { get; set; }

        /// <summary>
        /// The altinn org identifier of the organisation that were identified by maskinporten. 
        /// </summary>
        [JsonProperty(PropertyName = "orgId")]
        public string OrgId { get; set; }

        /// <summary>
        /// the authentication level for the user which triggered the event
        /// </summary>
        [JsonProperty(PropertyName = "authenticationLevel")]
        public int AuthenticationLevel { get; set; }

        /// <summary>
        /// the end user system that were used triggered the event.
        /// </summary>
        [JsonProperty(PropertyName = "endUserSystemId")]
        public int? EndUserSystemId { get; set; }
        
    }
}
