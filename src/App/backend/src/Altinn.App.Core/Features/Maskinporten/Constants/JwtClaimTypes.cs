using Altinn.App.Core.Constants;

namespace Altinn.App.Core.Features.Maskinporten.Constants;

/// <summary>
/// Relevant known Digdir JWT claim types.
/// </summary>
internal static class JwtClaimTypes
{
    public const string Expiration = "exp";
    public const string IssuedAt = "iat";
    public const string JwtId = "jti";
    public const string Audience = "aud";
    public const string Scope = "scope";
    public const string Issuer = "iss";
    public const string SecretId = "secret_id";

    public static class Altinn
    {
        public const string AuthenticationLevel = AltinnUrns.AuthenticationLevel;
        public const string UserId = AltinnUrns.UserId;
        public const string PartyId = AltinnUrns.PartyId;
        public const string RepresentingPartyId = AltinnUrns.RepresentingPartyId;
        public const string UserName = AltinnUrns.UserName;
        public const string Developer = AltinnUrns.Developer;
        public const string DeveloperToken = AltinnUrns.DeveloperToken;
        public const string DeveloperTokenId = AltinnUrns.DeveloperTokenId;
        public const string AuthenticateMethod = AltinnUrns.AuthenticationMethod;
        public const string Org = AltinnUrns.Org;
        public const string OrgNumber = AltinnUrns.OrgNumber;
    }

    public static class Maskinporten
    {
        public const string AuthenticationMethod = "client_amr";
        public const string ClientId = "client_id";
        public const string TokenType = "token_type";
        public const string Consumer = "consumer";
        public const string Supplier = "supplier";
        public const string DelegationSource = "delegation_source";
        public const string PersonIdentifier = "pid";

        /// <summary>
        /// The organisation a supplier requests a token on behalf of, via Altinn delegation.
        /// See <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_guide_apikonsument">the docs</a>.
        /// </summary>
        public const string ConsumerOrg = "consumer_org";

        /// <summary>
        /// Audience restriction for the resulting token (RFC 8707).
        /// See <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_func_audience_restricted_tokens">the docs</a>.
        /// </summary>
        public const string Resource = "resource";

        /// <summary>
        /// Rich authorization request details (RFC 9396). Used by Altinn for system user tokens.
        /// See <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_func_systembruker">the docs</a>.
        /// </summary>
        public const string AuthorizationDetails = "authorization_details";

        /// <summary>
        /// Field names and well-known values for a system user entry in the
        /// <see cref="AuthorizationDetails"/> claim.
        /// </summary>
        public static class SystemUserAuthorizationDetail
        {
            /// <summary>The <see cref="TypeKey"/> discriminator identifying an Altinn system user request.</summary>
            public const string TypeValue = "urn:altinn:systemuser";

            /// <summary>The ISO 6523 ICD scheme identifier used for Norwegian organisation numbers.</summary>
            public const string AuthorityValue = "iso6523-actorid-upis";

            public const string TypeKey = "type";
            public const string OrganisationKey = "systemuser_org";
            public const string ExternalRefKey = "externalRef";
            public const string AuthorityKey = "authority";
            public const string IdentifierKey = "ID";
        }
    }
}
