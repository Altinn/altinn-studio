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

    public static class Altinn
    {
        public const string AuthenticationLevel = "urn:altinn:authlevel";
        public const string UserId = "urn:altinn:userid";
        public const string PartyId = "urn:altinn:partyid";
        public const string RepresentingPartyId = "urn:altinn:representingpartyid";
        public const string UserName = "urn:altinn:username";
        public const string Developer = "urn:altinn:developer";
        public const string DeveloperToken = "urn:altinn:developertoken";
        public const string DeveloperTokenId = "urn:altinn:developertokenid";
        public const string AuthenticateMethod = "urn:altinn:authenticatemethod";
        public const string Org = "urn:altinn:org";
        public const string OrgNumber = "urn:altinn:orgNumber";
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
    }
}
