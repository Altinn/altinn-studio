#nullable enable
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Profile.Models;
using AltinnCore.Authentication.Constants;
using LocalTest.Clients.CdnAltinnOrgs;
using LocalTest.Configuration;
using LocalTest.Services.Authentication.Interface;
using LocalTest.Services.Register.Interface;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using AuthSettings = Altinn.Platform.Authentication.Configuration.GeneralSettings;

namespace LocalTest.Services.Authentication.Implementation;

public class AuthenticationService : IAuthentication
{
    private readonly AltinnOrgsClient _orgsClient;
    private readonly AuthSettings _authSettings;
    private readonly GeneralSettings _generalSettings;
    private readonly CertificateSettings _certSettings;
    private readonly IClaims _claimsService;
    private readonly IOrganizations _organisations;

    public AuthenticationService(
        AltinnOrgsClient orgsClient,
        IOptions<AuthSettings> authSettings,
        IOptions<GeneralSettings> generalSettings,
        IOptions<CertificateSettings> certSettings,
        IClaims claimsService,
        IOrganizations organisations
    )
    {
        _orgsClient = orgsClient;
        _authSettings = authSettings.Value;
        _generalSettings = generalSettings.Value;
        _certSettings = certSettings.Value;
        _claimsService = claimsService;
        _organisations = organisations;
    }

    ///<inheritdoc/>
    public string GenerateToken(ClaimsPrincipal principal)
    {
        TimeSpan tokenExpiry = new TimeSpan(0, _authSettings.GetJwtCookieValidityTime, 0);

        JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
        SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(principal.Identity),
            Expires = DateTime.UtcNow.AddSeconds(tokenExpiry.TotalSeconds),
            SigningCredentials = GetSigningCredentials(),
        };

        SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);
        string serializedToken = tokenHandler.WriteToken(token);

        return serializedToken;
    }

    public string GenerateToken(JwtPayload payload)
    {
        var now = DateTimeOffset.UtcNow;
        TimeSpan tokenExpiry = new TimeSpan(0, _authSettings.GetJwtCookieValidityTime, 0);

        JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
        
        var header = new JwtHeader(GetSigningCredentials());

        payload.TryAdd("exp", now.Add(tokenExpiry).ToUnixTimeSeconds());
        payload.TryAdd("iat", now.ToUnixTimeSeconds());
        payload.TryAdd("nbf", now.ToUnixTimeSeconds());
        payload.TryAdd("jti", Guid.NewGuid().ToString());

        var securityToken = new JwtSecurityToken(header, payload);
        return tokenHandler.WriteToken(securityToken);
    }

    private X509SigningCredentials GetSigningCredentials()
    {
        var cert = new X509Certificate2(_certSettings.CertificatePath, _certSettings.CertificatePwd);
        return new X509SigningCredentials(cert, SecurityAlgorithms.RsaSha256);
    }

    /// <inheritdoc />
    public async Task<string> GenerateTokenForOrg(
        string org,
        string? orgNumber = null,
        string? scopes = null,
        int? authenticationLevel = null
    )
    {
        if (orgNumber is null)
        {
            var orgs = await _orgsClient.GetCdnOrgs();
            orgNumber = (orgs.Orgs?.TryGetValue(org, out var value) == true ? value : null)?.Orgnr;
        }

        List<Claim> claims = new List<Claim>();
        string issuer = _generalSettings.Hostname;
        claims.Add(
            new Claim(AltinnCoreClaimTypes.Org, org.ToLower(), ClaimValueTypes.String, issuer)
        );
        claims.Add(
            new Claim(
                AltinnCoreClaimTypes.AuthenticationLevel,
                // 3 is the default authentication level from maskinporten
                (authenticationLevel ?? 3).ToString(),
                ClaimValueTypes.Integer32,
                issuer
            )
        );

        scopes ??= "altinn:serviceowner/instances.read";
        claims.Add(new Claim("urn:altinn:scope", scopes, ClaimValueTypes.String, issuer));
    
        if (!string.IsNullOrEmpty(orgNumber))
        {
            claims.Add(
                new Claim(AltinnCoreClaimTypes.OrgNumber, orgNumber, ClaimValueTypes.String, issuer)
            );
        }

        ClaimsIdentity identity = new ClaimsIdentity(_generalSettings.GetClaimsIdentity);
        identity.AddClaims(claims);
        ClaimsPrincipal principal = new ClaimsPrincipal(identity);

        // Create a test token with long duration
        return GenerateToken(principal);
    }

    /// <inheritdoc />
    public async Task<string> GenerateTokenForProfile(UserProfile profile, int authenticationLevel)
    {
        List<Claim> claims = new List<Claim>();
        string issuer = _generalSettings.Hostname;
        claims.Add(
            new Claim(
                ClaimTypes.NameIdentifier,
                profile.UserId.ToString(),
                ClaimValueTypes.String,
                issuer
            )
        );
        claims.Add(
            new Claim(
                AltinnCoreClaimTypes.UserId,
                profile.UserId.ToString(),
                ClaimValueTypes.String,
                issuer
            )
        );
        claims.Add(
            new Claim(
                AltinnCoreClaimTypes.UserName,
                profile.UserName,
                ClaimValueTypes.String,
                issuer
            )
        );
        claims.Add(
            new Claim(
                AltinnCoreClaimTypes.PartyID,
                profile.PartyId.ToString(),
                ClaimValueTypes.Integer32,
                issuer
            )
        );
        claims.Add(
            new Claim(
                AltinnCoreClaimTypes.AuthenticationLevel,
                authenticationLevel.ToString(),
                ClaimValueTypes.Integer32,
                issuer
            )
        );
        claims.AddRange(await _claimsService.GetCustomClaims(profile.UserId, issuer));
        if (!claims.Any(c => c.Type == "scope"))
        {
            claims.Add(new Claim("scope", "altinn:portal/enduser", ClaimValueTypes.String, issuer));
        }

        ClaimsIdentity identity = new ClaimsIdentity(_generalSettings.GetClaimsIdentity);
        identity.AddClaims(claims);
        ClaimsPrincipal principal = new ClaimsPrincipal(identity);

        return GenerateToken(principal);
    }

    public async Task<string> GenerateTokenForSystemUser(string systemId, string systemUserId, string systemUserOrgNumber, string supplierOrgNumber, string scope)
    {
        string iss = _generalSettings.Hostname;

        ArgumentException.ThrowIfNullOrWhiteSpace(systemUserOrgNumber);
        ArgumentException.ThrowIfNullOrWhiteSpace(supplierOrgNumber);
        ArgumentException.ThrowIfNullOrWhiteSpace(scope);
        
        var org = await _organisations.GetOrganization(systemUserOrgNumber);
        if (org is null)
            throw new ArgumentException("Organization not found in register", nameof(systemUserOrgNumber));

        var payload = new JwtPayload
        {
            // { "iss", iss },
            { "token_type", "Bearer" },
            { "scope", scope },
            { "client_id", Guid.NewGuid().ToString() },
            { "jti", Guid.NewGuid().ToString() },
            { AltinnCoreClaimTypes.OrgNumber, supplierOrgNumber },
            { AltinnCoreClaimTypes.AuthenticateMethod, "maskinporten" },
            { AltinnCoreClaimTypes.AuthenticationLevel, "3" },
        };
        
        AuthorizationDetailsClaim authorizationDetails = new SystemUserAuthorizationDetailsClaim(
            [Guid.Parse(systemUserId)],
            systemId,
            new OrgClaim(
                "iso6523-actorid-upis",
                 $"0192:{systemUserOrgNumber}"
            )
        );

        var consumer = new OrgClaim(
            "iso6523-actorid-upis",
            $"0192:{supplierOrgNumber}"
        );
        payload.Add("authorization_details", JsonSerializer.SerializeToElement(authorizationDetails));
        payload.Add("consumer", JsonSerializer.SerializeToElement(consumer));

        return GenerateToken(payload);
    }
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(SystemUserAuthorizationDetailsClaim), typeDiscriminator: "urn:altinn:systemuser")]
internal record AuthorizationDetailsClaim();

internal sealed record SystemUserAuthorizationDetailsClaim(
    [property: JsonPropertyName("systemuser_id")] IReadOnlyList<Guid> SystemUserId,
    [property: JsonPropertyName("system_id")] string SystemId,
    [property: JsonPropertyName("systemuser_org")] OrgClaim SystemUserOrg
) : AuthorizationDetailsClaim();

internal sealed record OrgClaim(
    [property: JsonPropertyName("authority")] string Authority,
    [property: JsonPropertyName("ID")] string Id
);
