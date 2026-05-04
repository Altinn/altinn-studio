using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Studio.Gateway.Api.Tests;

/// <summary>
/// Generates JWT tokens signed with the same key as the fake-oidc server in kind.
/// The private key is loaded from infra/kustomize/fake-oidc/private-key.json.
/// </summary>
internal static class FakeMaskinportenTokenGenerator
{
    private const string Issuer = "http://fake-oidc.default.svc.cluster.local";
    private const string PrivateKeyPath = "TestData/fake-oidc-private-key.json";

    private static readonly Lazy<SigningCredentials> _signingCredentials = new(LoadSigningCredentials);

    private static SigningCredentials LoadSigningCredentials()
    {
        var json = File.ReadAllText(PrivateKeyPath);
        var jwk = new JsonWebKey(json);
        return new SigningCredentials(jwk, SecurityAlgorithms.RsaSha256);
    }

    /// <summary>
    /// Generates a valid Maskinporten-style JWT token with the specified scope.
    /// </summary>
    public static string GenerateToken(string scope, TimeSpan? expiry = null)
    {
        var now = DateTime.UtcNow;
        var handler = new JsonWebTokenHandler();
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = Issuer,
            IssuedAt = now,
            Expires = now.Add(expiry ?? TimeSpan.FromMinutes(5)),
            SigningCredentials = _signingCredentials.Value,
            Claims = new Dictionary<string, object> { ["scope"] = scope, ["jti"] = Guid.NewGuid().ToString() },
        };

        return handler.CreateToken(descriptor);
    }

    /// <summary>
    /// Generates a token with the correct scope for Gateway.
    /// </summary>
    public static string GenerateValidToken() => GenerateToken("altinn:studio/gateway");

    /// <summary>
    /// Generates a token with an incorrect scope.
    /// </summary>
    public static string GenerateTokenWithWrongScope() => GenerateToken("altinn:wrong-scope");

    /// <summary>
    /// Generates an expired token.
    /// </summary>
    public static string GenerateExpiredToken() => GenerateToken("altinn:studio/gateway", TimeSpan.FromMinutes(-5));
}
