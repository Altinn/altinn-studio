namespace AltinnCore.Authentication.Constants
{
    /// <summary>
    /// Constants that defines the claim types used in Altinn core authentication
    /// </summary>
    public static class AltinnCoreClaimTypes
    {
        /// <summary>
        /// The Authentication level
        /// </summary>
        public const string AuthenticationLevel = "urn:altinn:authlevel";

        /// <summary>
        /// The UserID for the user profile in the platform
        /// </summary>
        public const string UserId = "urn:altinn:userid";

        /// <summary>
        /// The PartyID in register for a given user
        /// </summary>
        public const string PartyID = "urn:altinn:partyid";

        /// <summary>
        /// The PartyId in register for the party the user is representing
        /// </summary>
        public const string RepresentingPartyId = "urn:altinn:representingpartyid";

        /// <summary>
        /// Username defined in the profile
        /// </summary>
        public const string UserName = "urn:altinn:username";

        /// <summary>
        /// UserName for the service developer
        /// </summary>
        public const string Developer = "urn:altinn:developer";

        /// <summary>
        /// The app token
        /// </summary>
        public const string DeveloperToken = "urn:altinn:developertoken";

        /// <summary>
        /// The app token id
        /// </summary>
        public const string DeveloperTokenId = "urn:altinn:developertokenid";

        /// <summary>
        /// The authenticate method
        /// </summary>
        public const string AuthenticateMethod = "urn:altinn:authenticatemethod";

        /// <summary>
        /// The org identifier.
        /// </summary>
        public const string Org = "urn:altinn:org";

        /// <summary>
        /// The org number.
        /// </summary>
        public const string OrgNumber = "urn:altinn:orgNumber";
    }
}
