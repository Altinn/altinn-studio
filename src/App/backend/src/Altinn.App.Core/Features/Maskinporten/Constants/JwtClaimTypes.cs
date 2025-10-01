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
    }
}
