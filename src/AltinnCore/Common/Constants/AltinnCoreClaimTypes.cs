namespace AltinnCore.Common.Constants
{
    /// <summary>
    /// Constants that defines the claim types used in Altinn core authentication
    /// </summary>
    public static class AltinnCoreClaimTypes
    {
        /// <summary>
        /// The Authentication level
        /// </summary>
        public const string AuthenticationLevel = "AuthenticationLevel";

        /// <summary>
        /// Social Security Number
        /// </summary>
        public const string SSN = "SSN";

        /// <summary>
        /// The UserID for the user profile in the platform
        /// </summary>
        public const string UserId = "UserID";

        /// <summary>
        /// The PartyID in register for a given user
        /// </summary>
        public const string PartyID = "PartyID";

        /// <summary>
        /// Username defined in the profile
        /// </summary>
        public const string UserName = "UserName";

        /// <summary>
        /// UserName for the service developer
        /// </summary>
        public const string Developer = "Developer";

        /// <summary>
        /// The app token
        /// </summary>
        public const string DeveloperToken = "DeveloperToken";

        /// <summary>
        /// The app token id
        /// </summary>
        public const string DeveloperTokenId = "DeveloperTokenId";
    }
}
