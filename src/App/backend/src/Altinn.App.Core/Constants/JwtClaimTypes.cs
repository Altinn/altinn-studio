namespace Altinn.App.Core.Constants;

/// <summary>
/// JWT claim types the app reads or issues, grouped by the token they belong to.
/// </summary>
internal static class JwtClaimTypes
{
    public const string Expiration = "exp";
    public const string IssuedAt = "iat";
    public const string JwtId = "jti";
    public const string Audience = "aud";
    public const string Scope = "scope";
    public const string Issuer = "iss";

    /// <summary>
    /// Claims of the tokens the app signs with its own app codes: notification condition and workflow-engine
    /// callback tokens.
    /// </summary>
    public static class AppCode
    {
        /// <summary>
        /// The id of the app code that signed the token, so a validator can pick it out.
        /// </summary>
        public const string SecretId = "secret_id";
    }

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

    /// <summary>
    /// Claims of the workflow-engine callback token, beyond <see cref="JwtId"/> and <see cref="AppCode.SecretId"/>.
    /// </summary>
    public static class WorkflowCallback
    {
        /// <summary>
        /// A hash of the identity of the actor the token was minted for.
        /// </summary>
        public const string ActorHash = "actor_sha256";

        /// <summary>
        /// The app command keys the token may call back for, as a JSON array.
        /// </summary>
        public const string Commands = "commands";
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

        public const string ConsumerOrg = "consumer_org";
        public const string Resource = "resource";
        public const string AuthorizationDetails = "authorization_details";
    }
}
