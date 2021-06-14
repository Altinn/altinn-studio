using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Enum;
using Microsoft.AspNetCore.Authentication;
using Newtonsoft.Json;

namespace Altinn.Platform.Authentication.Model
{
    /// <summary>
    /// Handles UserProfile
    /// </summary>
    [DataContract]
    public class UserAuthenticationResult
    {
        /// <summary>
        /// Gets or sets Identifier used to uniquely identify User
        /// </summary>
        [DataMember]
        [JsonProperty("UserID")]
        public int UserID { get; set; }

        /// <summary>
        /// Gets or sets Identifier used to uniquely identify PartyID for user
        /// </summary>
        [DataMember]
        [JsonProperty("Username")]
        public string Username { get; set; }

        /// <summary>
        /// Gets or sets Social Security Number
        /// </summary>
        [DataMember]
        [JsonProperty("SSN")]
        public string SSN { get; set; }

        /// <summary>
        /// Gets or sets PartyID
        /// </summary>
        [DataMember]
        [JsonProperty("PartyID")]
        public int PartyID { get; set; }

        /// <summary>
        /// Gets or sets Authentication results
        /// </summary>
        [DataMember]
        [JsonProperty("AuthenticateResult")]
        public int AuthenticateResult { get; set; }

        /// <summary>
        /// Gets or sets Authentication method
        /// </summary>
        [DataMember]
        [JsonProperty("AuthenticationMethod")]
        public int AuthenticationMethod { get; set; }

        /// <summary>
        /// Gets or sets The locked out date time
        /// </summary>
        [DataMember]
        [JsonProperty("LockedOutDate")]
        public DateTime LockedOutDate { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether or not the user have upgraded SMS-PIN to give access level 3.
        /// </summary>
        [DataMember]
        [JsonProperty("SmsPinUpgraded")]
        public bool SmsPinUpgraded { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether or not the user is a test user.
        /// </summary>
        [DataMember]
        [JsonProperty("IsTestUser")]
        public bool IsTestUser { get; set; }

        /// <summary>
        /// Gets or sets a name id (if ID-Porten login)
        /// </summary>
        [DataMember]
        [JsonProperty("IDPortenNameID")]
        public string IDPortenNameID { get; set; }

        /// <summary>
        /// Gets or sets a session id (if ID-Porten login)
        /// </summary>
        [DataMember]
        [JsonProperty("IDPortenSessionIndex")]
        public string IDPortenSessionIndex { get; set; }
    }
}
