using System;

namespace Altinn.Platform.Authentication.Model
{
    /// <summary>
    /// Handles UserAuthenticationResult from SBL-bridge
    /// </summary>
    public class UserAuthenticationResult
    {
        /// <summary>
        /// Gets or sets Identifier used to uniquely identify User
        /// </summary>
        public int UserID { get; set; }

        /// <summary>
        /// Gets or sets Username for user
        /// </summary>
        public string Username { get; set; }

        /// <summary>
        /// Gets or sets Social Security Number
        /// </summary>
        public string SSN { get; set; }

        /// <summary>
        /// Gets or sets PartyID
        /// </summary>
        public int PartyID { get; set; }

        /// <summary>
        /// Gets or sets Authentication results
        /// </summary>
        public int AuthenticateResult { get; set; }

        /// <summary>
        /// Gets or sets Authentication method
        /// </summary>
        public int AuthenticationMethod { get; set; }

        /// <summary>
        /// Gets or sets The locked out date time
        /// </summary>
        public DateTime LockedOutDate { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether or not the user have upgraded SMS-PIN to give access level 3.
        /// </summary>
        public bool SmsPinUpgraded { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether or not the user is a test user.
        /// </summary>
        public bool IsTestUser { get; set; }

        /// <summary>
        /// Gets or sets a name id (if ID-Porten login)
        /// </summary>
        public string IDPortenNameID { get; set; }

        /// <summary>
        /// Gets or sets a session id (if ID-Porten login)
        /// </summary>
        public string IDPortenSessionIndex { get; set; }
    }
}
