#nullable enable
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;
using AuthSettings = Altinn.Platform.Authentication.Configuration.GeneralSettings;
using Altinn.Platform.Profile.Models;
using LocalTest.Clients.CdnAltinnOrgs;
using LocalTest.Services.Authentication.Interface;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using LocalTest.Configuration;
using AltinnCore.Authentication.Constants;
using Altinn.Platform.Authorization.Services.Interface;

namespace LocalTest.Services.Authentication.Implementation;

public class AuthenticationService : IAuthentication
{
    private readonly AltinnOrgsClient _orgsClient;
    private readonly AuthSettings _authSettings;
    private readonly GeneralSettings _generalSettings;
    private readonly IClaims _claimsService;

    public AuthenticationService(AltinnOrgsClient orgsClient, IOptions<AuthSettings> authSettings, IOptions<GeneralSettings> generalSettings, IClaims claimsService)
    {
        _orgsClient = orgsClient;
        _authSettings = authSettings.Value;
        _generalSettings = generalSettings.Value;
        _claimsService = claimsService;
    }
    ///<inheritdoc/>
    public string GenerateToken(ClaimsPrincipal principal)
    {
        List<X509Certificate2> certificates = new List<X509Certificate2>
        {
            new X509Certificate2("jwtselfsignedcert.pfx", "qwer1234") // lgtm [cs/hardcoded-credentials]
        };

        TimeSpan tokenExpiry = new TimeSpan(0, _authSettings.GetJwtCookieValidityTime, 0);

        JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
        SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(principal.Identity),
            Expires = DateTime.UtcNow.AddSeconds(tokenExpiry.TotalSeconds),
            SigningCredentials = new X509SigningCredentials(certificates[0])
        };

        SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);
        string serializedToken = tokenHandler.WriteToken(token);

        return serializedToken;
    }

    /// <inheritdoc />
    public async Task<string> GenerateTokenForOrg(string org, string? orgNumber = null)
    {
        if (orgNumber is null)
        {
            var orgs = await _orgsClient.GetCdnOrgs();
            orgNumber = (orgs.Orgs?.TryGetValue(org, out var value) == true ? value : null)?.Orgnr;
        }

        List<Claim> claims = new List<Claim>();
        string issuer = _generalSettings.Hostname;
        claims.Add(new Claim(AltinnCoreClaimTypes.Org, org.ToLower(), ClaimValueTypes.String, issuer));
        // 3 is the default level for altinn tokens form Maskinporten
        claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "3", ClaimValueTypes.Integer32, issuer));
        claims.Add(new Claim("urn:altinn:scope", "altinn:serviceowner/instances.read", ClaimValueTypes.String, issuer));
        if (!string.IsNullOrEmpty(orgNumber))
        {
            claims.Add(new Claim(AltinnCoreClaimTypes.OrgNumber, orgNumber, ClaimValueTypes.String, issuer));
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
        claims.Add(new Claim(ClaimTypes.NameIdentifier, profile.UserId.ToString(), ClaimValueTypes.String, issuer));
        claims.Add(new Claim(AltinnCoreClaimTypes.UserId, profile.UserId.ToString(), ClaimValueTypes.String, issuer));
        claims.Add(new Claim(AltinnCoreClaimTypes.UserName, profile.UserName, ClaimValueTypes.String, issuer));
        claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, profile.PartyId.ToString(), ClaimValueTypes.Integer32, issuer));
        claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, authenticationLevel.ToString(), ClaimValueTypes.Integer32, issuer));
        claims.AddRange(await _claimsService.GetCustomClaims(profile.UserId, issuer));

        ClaimsIdentity identity = new ClaimsIdentity(_generalSettings.GetClaimsIdentity);
        identity.AddClaims(claims);
        ClaimsPrincipal principal = new ClaimsPrincipal(identity);

        return GenerateToken(principal);
    }
}

