using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Constants;
using Xunit.Abstractions;
using static Altinn.App.Core.Features.Auth.Authenticated;

namespace Altinn.App.Tests.Common.Auth;

public enum AuthenticationTypes
{
    User = 1,
    SelfIdentifiedUser = 2,
    Org = 3,
    SystemUser = 4,
    ServiceOwner = 5,
    Unknown = 99,
}

public sealed class TestJwtToken : IXunitSerializable
{
    public AuthenticationTypes Type { get; set; }
    public int PartyId { get; set; }

    // NOTE: it's important that the token is not part of the XUnit serialization
    // as the tokens content is time sensitive (nbf, exp), so they should be created lazily.
    // Including it as part of serialiation will lead to flaky tests as it's possible to
    // run test cases in a IDE test explorer which was serialized >= 'token.exp' ago
    private string? _token;
    public string Token
    {
        get
        {
            if (_token is not null)
                return _token;

            _token = Type switch
            {
                AuthenticationTypes.User => TestAuthentication.GetUserToken(),
                AuthenticationTypes.SelfIdentifiedUser => TestAuthentication.GetSelfIdentifiedUserToken(),
                // AuthenticationTypes.Org => TestAuthentication.GetOrgToken(),
                AuthenticationTypes.ServiceOwner => TestAuthentication.GetServiceOwnerToken(),
                AuthenticationTypes.SystemUser => TestAuthentication.GetSystemUserToken(),
                _ => throw new InvalidOperationException("Unsupported token type: " + Type),
            };
            return _token;
        }
    }

    private Authenticated? _auth;
    public Authenticated Auth
    {
        get
        {
            if (_auth is not null)
                return _auth;

            _auth = Type switch
            {
                AuthenticationTypes.User => TestAuthentication.GetUserAuthentication(),
                AuthenticationTypes.SelfIdentifiedUser => TestAuthentication.GetSelfIdentifiedUserAuthentication(),
                // AuthenticationTypes.Org => TestAuthentication.GetOrgAuthentication(),
                AuthenticationTypes.ServiceOwner => TestAuthentication.GetServiceOwnerAuthentication(),
                AuthenticationTypes.SystemUser => TestAuthentication.GetSystemUserAuthentication(),
                _ => throw new Exception(),
            };
            return _auth;
        }
    }

    public override string ToString() => $"{Type}={PartyId}";

    public TestJwtToken() { }

    public TestJwtToken(AuthenticationTypes type, int partyId)
    {
        Type = type;
        PartyId = partyId;
    }

    public void Deserialize(IXunitSerializationInfo info)
    {
        Type = (AuthenticationTypes)info.GetValue<int>("Type");
        PartyId = info.GetValue<int>("PartyId");
    }

    public void Serialize(IXunitSerializationInfo info)
    {
        info.AddValue("Type", (int)Type);
        info.AddValue("PartyId", PartyId);
    }
}

public static class TestAuthentication
{
    public const int DefaultUserId = 1337;
    public const int DefaultUserPartyId = 501337;
    public const string DefaultUsername = "testuser";
    public const int DefaultUserAuthenticationLevel = 2;

    public const string DefaultOrgNumber = "405003309";
    public const string DefaultOrg = "tdd";
    public const int DefaultOrgPartyId = 5001337;
    public const string DefaultServiceOwnerScope =
        "altinn:serviceowner/instances.read altinn:serviceowner/instances.write";
    public const string DefaultOrgScope = "altinn:instances.read altinn:instances.write";

    public const string DefaultSystemUserId = "f58fe166-bc22-4899-beb7-c3e8e3332f43";
    public const string DefaultSystemId = "1cb8b115-31bf-421f-8029-8bb0cd23c954";
    public const string DefaultSystemUserOrgNumber = "310702641";
    public const string DefaultSystemUserSupplierOrgNumber = "991825827";

    public sealed class AllTokens : TheoryData<TestJwtToken>
    {
        public AllTokens()
        {
            Add(new(AuthenticationTypes.User, DefaultUserPartyId));
            Add(new(AuthenticationTypes.SelfIdentifiedUser, DefaultUserPartyId));
            // Add(new(AuthenticationTypes.Org, DefaultOrgPartyId));
            Add(new(AuthenticationTypes.ServiceOwner, DefaultOrgPartyId));
            Add(new(AuthenticationTypes.SystemUser, DefaultOrgPartyId));
        }
    }

    public sealed class AllTypes : TheoryData<AuthenticationTypes>
    {
        public AllTypes()
        {
            Add(AuthenticationTypes.User);
            Add(AuthenticationTypes.SelfIdentifiedUser);
            // Add(AuthenticationTypes.Org);
            Add(AuthenticationTypes.ServiceOwner);
            Add(AuthenticationTypes.SystemUser);
        }
    }

    public static None GetNoneAuthentication(ApplicationMetadata? applicationMetadata = null)
    {
        var auth = Authenticated.From(
            "",
            null,
            false,
            applicationMetadata ?? NewApplicationMetadata(),
            () => null,
            _ => Task.FromResult<UserProfile?>(null),
            _ => Task.FromResult<Party?>(null),
            _ => Task.FromResult<Party>(null!),
            _ => Task.FromResult<List<Party>?>(null),
            (_, _) => Task.FromResult<bool?>(null)
        );
        return Assert.IsType<None>(auth);
    }

    public static string GetUserToken(
        int userId = DefaultUserId,
        int partyId = DefaultUserPartyId,
        int authenticationLevel = DefaultUserAuthenticationLevel
    )
    {
        ClaimsPrincipal principal = GetUserPrincipal(userId, partyId, authenticationLevel);
        string token = JwtTokenMock.GenerateToken(principal, TimeSpan.FromMinutes(10));
        return token;
    }

    public static ClaimsPrincipal GetUserPrincipal(
        int userId = DefaultUserId,
        int partyId = DefaultUserPartyId,
        int authLevel = DefaultUserAuthenticationLevel
    )
    {
        // Returns a principal that looks like a token issed in tt02 Altinn portal using TestID
        string iss = "https://platform.tt02.altinn.no/authentication/api/v1/openid/";

        Claim[] claims =
        [
            new(ClaimTypes.NameIdentifier, userId.ToString(), ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.UserId, userId.ToString(), ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.PartyID, partyId.ToString(), ClaimValueTypes.Integer32, iss),
            new(AltinnCoreClaimTypes.AuthenticateMethod, "BankID", ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.AuthenticationLevel, authLevel.ToString(), ClaimValueTypes.Integer32, iss),
            new("jti", Guid.NewGuid().ToString(), ClaimValueTypes.String, iss),
            new(JwtClaimTypes.Scope, "altinn:portal/enduser", ClaimValueTypes.String, iss),
        ];

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "mock"));
    }

    public static User GetUserAuthentication(
        int userId = DefaultUserId,
        int userPartyId = DefaultUserPartyId,
        int authenticationLevel = DefaultUserAuthenticationLevel,
        string? email = null,
        string? ssn = null,
        ProfileSettingPreference? profileSettingPreference = null,
        ApplicationMetadata? applicationMetadata = null
    )
    {
        var token = GetUserToken(userId: userId, partyId: userPartyId, authenticationLevel: authenticationLevel);
        var party = new Party()
        {
            PartyId = userPartyId,
            PartyTypeName = PartyType.Person,
            OrgNumber = null,
            SSN = ssn ?? "12345678901",
            Name = "Test Testesen",
        };
        var auth = Authenticated.From(
            token,
            null,
            true,
            applicationMetadata ?? NewApplicationMetadata(),
            getSelectedParty: () => $"{userPartyId}",
            getUserProfile: uid =>
            {
                Assert.Equal(userId, uid);
                return Task.FromResult<UserProfile?>(
                    new UserProfile()
                    {
                        UserId = userId,
                        PartyId = userPartyId,
                        Party = party,
                        Email = email ?? "test@testesen.no",
                        ProfileSettingPreference = profileSettingPreference,
                    }
                );
            },
            lookupUserParty: partyId =>
            {
                Assert.Equal(userPartyId, partyId);
                return Task.FromResult<Party?>(party);
            },
            lookupOrgParty: _ => throw new NotImplementedException(),
            getPartyList: uid =>
            {
                Assert.Equal(userId, uid);
                return Task.FromResult<List<Party>?>([party]);
            },
            validateSelectedParty: (uid, pid) =>
            {
                Assert.Equal(userId, uid);
                Assert.Equal(userPartyId, pid);
                return Task.FromResult<bool?>(true);
            }
        );
        return Assert.IsType<User>(auth);
    }

    public static string GetSelfIdentifiedUserToken(
        string username = DefaultUsername,
        int userId = DefaultUserId,
        int partyId = DefaultUserPartyId
    )
    {
        ClaimsPrincipal principal = GetSelfIdentifiedUserPrincipal(username, userId, partyId);
        string token = JwtTokenMock.GenerateToken(principal, TimeSpan.FromMinutes(10));
        return token;
    }

    public static ClaimsPrincipal GetSelfIdentifiedUserPrincipal(
        string username = DefaultUsername,
        int userId = DefaultUserId,
        int partyId = DefaultUserPartyId
    )
    {
        // Returns a principal that looks like a token issed in tt02 Altinn portal using the
        // "Logg inn uten fødselsnummer/D-nummber" login method
        string iss = "https://platform.tt02.altinn.no/authentication/api/v1/openid/";

        Claim[] claims =
        [
            new(ClaimTypes.NameIdentifier, userId.ToString(), ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.UserId, userId.ToString(), ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.UserName, username, ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.PartyID, partyId.ToString(), ClaimValueTypes.Integer32, iss),
            new(AltinnCoreClaimTypes.AuthenticateMethod, "Mock", ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.AuthenticationLevel, "0", ClaimValueTypes.Integer32, iss),
            new("jti", Guid.NewGuid().ToString(), ClaimValueTypes.String, iss),
            new(JwtClaimTypes.Scope, "altinn:portal/enduser", ClaimValueTypes.String, iss),
        ];

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "mock"));
    }

    public static User GetSelfIdentifiedUserAuthentication(
        string username = DefaultUsername,
        int userId = DefaultUserId,
        int partyId = DefaultUserPartyId,
        string? email = null,
        ProfileSettingPreference? profileSettingPreference = null,
        ApplicationMetadata? applicationMetadata = null
    )
    {
        var token = GetSelfIdentifiedUserToken(username: username, userId: userId, partyId: partyId);
        var party = new Party()
        {
            PartyId = partyId,
            PartyTypeName = PartyType.SelfIdentified,
            OrgNumber = null,
            Name = "Test Testesen",
        };
        var auth = Authenticated.From(
            token,
            null,
            true,
            applicationMetadata ?? NewApplicationMetadata(),
            getSelectedParty: () => $"{partyId}",
            getUserProfile: uid =>
            {
                Assert.Equal(userId, uid);
                return Task.FromResult<UserProfile?>(
                    new UserProfile()
                    {
                        UserId = userId,
                        UserName = username,
                        PartyId = partyId,
                        Party = party,
                        Email = email ?? "test@testesen.no",
                        ProfileSettingPreference = profileSettingPreference,
                    }
                );
            },
            lookupUserParty: partyId =>
            {
                Assert.Equal(partyId, partyId);
                return Task.FromResult<Party?>(party);
            },
            lookupOrgParty: _ => throw new NotImplementedException(),
            getPartyList: uid =>
            {
                Assert.Equal(userId, uid);
                return Task.FromResult<List<Party>?>([party]);
            },
            validateSelectedParty: (uid, pid) =>
            {
                Assert.Equal(userId, uid);
                Assert.Equal(partyId, pid);
                return Task.FromResult<bool?>(true);
            }
        );
        return Assert.IsType<User>(auth);
    }

    public static ClaimsPrincipal GetOrgPrincipal(string orgNumber = DefaultOrgNumber, string scope = DefaultOrgScope)
    {
        // Returns a principal that looks like a token issued by Maskinporten and exchanged to Altinn token in tt02
        // This is not a service owner token, so there should be no service owner scope
        string iss = "https://platform.tt02.altinn.no/authentication/api/v1/openid/";

        var scopes = new Scopes(scope);
        if (scopes.HasScopeWithPrefix("altinn:serviceowner/"))
            throw new InvalidOperationException("Org token cannot have serviceowner scopes");

        var consumer = JsonSerializer.Serialize(
            new OrgClaim(
                "iso6523-actorid-upis",
                OrganisationNumber.Parse(orgNumber).Get(OrganisationNumberFormat.International)
            )
        );
        Claim[] claims =
        [
            new(JwtClaimTypes.Scope, scope, ClaimValueTypes.String, iss),
            new("token_type", AuthorizationSchemes.Bearer, ClaimValueTypes.String, iss),
            new("client_id", Guid.NewGuid().ToString(), ClaimValueTypes.String, iss),
            new("consumer", consumer, ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.OrgNumber, orgNumber, ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.AuthenticateMethod, "maskinporten", ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.AuthenticationLevel, "3", ClaimValueTypes.Integer32, iss),
            new(JwtClaimTypes.Issuer, iss, ClaimValueTypes.String, iss),
            new("jti", Guid.NewGuid().ToString(), ClaimValueTypes.String, iss),
        ];

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "mock"));
    }

    public static string GetOrgToken(
        string orgNumber = DefaultOrgNumber,
        string scope = DefaultOrgScope,
        TimeSpan? expiry = null,
        TimeProvider? timeProvider = null
    )
    {
        ClaimsPrincipal principal = GetOrgPrincipal(orgNumber, scope);
        return JwtTokenMock.GenerateToken(principal, expiry ?? TimeSpan.FromMinutes(2), timeProvider);
    }

    public static Org GetOrgAuthentication(
        string orgNumber = DefaultOrgNumber,
        int partyId = DefaultOrgPartyId,
        string scope = DefaultOrgScope,
        ApplicationMetadata? applicationMetadata = null
    )
    {
        var token = GetOrgToken(orgNumber: orgNumber, scope: scope);
        var party = new Party()
        {
            PartyId = partyId,
            PartyTypeName = PartyType.Organisation,
            OrgNumber = orgNumber,
            Name = "Test AS",
        };
        var auth = Authenticated.From(
            token,
            null,
            true,
            applicationMetadata ?? NewApplicationMetadata(),
            getSelectedParty: () => throw new NotImplementedException(),
            getUserProfile: _ => throw new NotImplementedException(),
            lookupUserParty: _ => throw new NotImplementedException(),
            lookupOrgParty: orgNo =>
            {
                Assert.Equal(orgNumber, orgNo);
                return Task.FromResult<Party>(party);
            },
            getPartyList: _ => throw new NotImplementedException(),
            validateSelectedParty: (_, __) => throw new NotImplementedException()
        );
        return Assert.IsType<Org>(auth);
    }

    public static ClaimsPrincipal GetServiceOwnerPrincipal(
        string orgNumber = DefaultOrgNumber,
        string scope = DefaultServiceOwnerScope,
        string org = DefaultOrg
    )
    {
        // Returns a principal that looks like a token issued by Maskinporten and exchanged to Altinn token in tt02
        // This is a service owner token, so there should be at least 1 service owner scope
        const string iss = "https://platform.tt02.altinn.no/authentication/api/v1/openid/";

        var scopes = new Scopes(scope);
        if (!scopes.HasScopeWithPrefix("altinn:serviceowner/"))
            throw new InvalidOperationException("Service owner token must have serviceowner scopes");

        var consumer = JsonSerializer.Serialize(
            new OrgClaim(
                "iso6523-actorid-upis",
                OrganisationNumber.Parse(orgNumber).Get(OrganisationNumberFormat.International)
            )
        );
        Claim[] claims =
        [
            new(JwtClaimTypes.Scope, scope, ClaimValueTypes.String, iss),
            new("token_type", AuthorizationSchemes.Bearer, ClaimValueTypes.String, iss),
            new("client_id", Guid.NewGuid().ToString(), ClaimValueTypes.String, iss),
            new("consumer", consumer, ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.Org, org, ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.OrgNumber, orgNumber, ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.AuthenticateMethod, "maskinporten", ClaimValueTypes.String, iss),
            new(AltinnCoreClaimTypes.AuthenticationLevel, "3", ClaimValueTypes.Integer32, iss),
            new(JwtClaimTypes.Issuer, iss, ClaimValueTypes.String, iss),
            new("jti", Guid.NewGuid().ToString(), ClaimValueTypes.String, iss),
        ];

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "mock"));
    }

    public static string GetServiceOwnerToken(
        string orgNumber = DefaultOrgNumber,
        string scope = DefaultServiceOwnerScope,
        string org = DefaultOrg,
        TimeSpan? expiry = null,
        TimeProvider? timeProvider = null
    )
    {
        ClaimsPrincipal principal = GetServiceOwnerPrincipal(orgNumber, scope, org);
        return JwtTokenMock.GenerateToken(principal, expiry ?? TimeSpan.FromMinutes(2), timeProvider);
    }

    public static ServiceOwner GetServiceOwnerAuthentication(
        string orgNumber = DefaultOrgNumber,
        string scope = DefaultServiceOwnerScope,
        string org = DefaultOrg,
        int partyId = DefaultOrgPartyId,
        ApplicationMetadata? applicationMetadata = null
    )
    {
        var token = GetServiceOwnerToken(orgNumber: orgNumber, scope: scope, org: org);
        var party = new Party()
        {
            PartyId = partyId,
            PartyTypeName = PartyType.Organisation,
            OrgNumber = orgNumber,
            Name = "Test AS",
        };
        var auth = Authenticated.From(
            token,
            null,
            true,
            applicationMetadata ?? NewApplicationMetadata(org: org),
            getSelectedParty: () => throw new NotImplementedException(),
            getUserProfile: _ => throw new NotImplementedException(),
            lookupUserParty: _ => throw new NotImplementedException(),
            lookupOrgParty: orgNo =>
            {
                Assert.Equal(orgNumber, orgNo);
                return Task.FromResult<Party>(party);
            },
            getPartyList: _ => throw new NotImplementedException(),
            validateSelectedParty: (_, __) => throw new NotImplementedException()
        );
        return Assert.IsType<ServiceOwner>(auth);
    }

    public static JwtPayload GetSystemUserPayload(
        string systemId = DefaultSystemId,
        string systemUserId = DefaultSystemUserId,
        string systemUserOrgNumber = DefaultSystemUserOrgNumber,
        string supplierOrgNumber = DefaultSystemUserSupplierOrgNumber,
        string scope = DefaultOrgScope
    )
    {
        // Returns a principal that looks like a token issued by Maskinporten and exchanged to Altinn token in tt02
        // This is a service owner token, so there should be atleast 1 service owner scope
        string iss = "https://platform.tt02.altinn.no/authentication/api/v1/openid/";

        var scopes = new Scopes(scope);
        if (scopes.HasScopeWithPrefix("altinn:serviceowner/"))
            throw new InvalidOperationException("System user tokens cannot have serviceowner scopes");

        var payload = new JwtPayload
        {
            { JwtClaimTypes.Issuer, iss },
            { "token_type", AuthorizationSchemes.Bearer },
            { JwtClaimTypes.Scope, scope },
            { "client_id", Guid.NewGuid().ToString() },
            { "jti", Guid.NewGuid().ToString() },
            { AltinnCoreClaimTypes.OrgNumber, supplierOrgNumber },
            { AltinnCoreClaimTypes.AuthenticateMethod, "maskinporten" },
            { AltinnCoreClaimTypes.AuthenticationLevel, 3 },
        };

        AuthorizationDetailsClaim authorizationDetails = new SystemUserAuthorizationDetailsClaim(
            [Guid.Parse(systemUserId)],
            systemId,
            new OrgClaim(
                "iso6523-actorid-upis",
                OrganisationNumber.Parse(systemUserOrgNumber).Get(OrganisationNumberFormat.International)
            )
        );

        var consumer = new OrgClaim(
            "iso6523-actorid-upis",
            OrganisationNumber.Parse(supplierOrgNumber).Get(OrganisationNumberFormat.International)
        );
        payload.Add("authorization_details", JsonSerializer.SerializeToElement(authorizationDetails));
        payload.Add("consumer", JsonSerializer.SerializeToElement(consumer));

        return payload;
    }

    public static string GetSystemUserToken(
        string systemId = DefaultSystemId,
        string systemUserId = DefaultSystemUserId,
        string systemUserOrgNumber = DefaultSystemUserOrgNumber,
        string supplierOrgNumber = DefaultSystemUserSupplierOrgNumber,
        string scope = DefaultOrgScope,
        TimeSpan? expiry = null,
        TimeProvider? timeProvider = null
    )
    {
        JwtPayload payload = GetSystemUserPayload(
            systemId,
            systemUserId,
            systemUserOrgNumber,
            supplierOrgNumber,
            scope
        );
        return JwtTokenMock.GenerateToken(payload, expiry ?? TimeSpan.FromMinutes(2), timeProvider);
    }

    public static SystemUser GetSystemUserAuthentication(
        string systemId = DefaultSystemId,
        string systemUserId = DefaultSystemUserId,
        string systemUserOrgNumber = DefaultSystemUserOrgNumber,
        string supplierOrgNumber = DefaultSystemUserSupplierOrgNumber,
        string scope = DefaultOrgScope,
        int partyId = DefaultOrgPartyId,
        ApplicationMetadata? applicationMetadata = null
    )
    {
        var token = GetSystemUserToken(
            systemId: systemId,
            systemUserId: systemUserId,
            systemUserOrgNumber: systemUserOrgNumber,
            supplierOrgNumber: supplierOrgNumber,
            scope: scope
        );
        var party = new Party()
        {
            PartyId = partyId,
            PartyTypeName = PartyType.Organisation,
            OrgNumber = systemUserOrgNumber,
            Name = "Test AS",
        };
        var auth = Authenticated.From(
            token,
            null,
            true,
            applicationMetadata ?? NewApplicationMetadata(),
            getSelectedParty: () => throw new NotImplementedException(),
            getUserProfile: _ => throw new NotImplementedException(),
            lookupUserParty: _ => throw new NotImplementedException(),
            lookupOrgParty: orgNo =>
            {
                Assert.Equal(systemUserOrgNumber, orgNo);
                return Task.FromResult<Party>(party);
            },
            getPartyList: _ => throw new NotImplementedException(),
            validateSelectedParty: (_, __) => throw new NotImplementedException()
        );
        return Assert.IsType<SystemUser>(auth);
    }

    public static ApplicationMetadata NewApplicationMetadata(string org = "ttd")
    {
        return new ApplicationMetadata($"{org}/app")
        {
            Org = org,
            PartyTypesAllowed = new PartyTypesAllowed()
            {
                BankruptcyEstate = true,
                Organisation = true,
                Person = true,
                SubUnit = true,
            },
        };
    }

    internal static MaskinportenTokenResponse GetMaskinportenToken(
        string scope,
        TimeSpan? expiry = null,
        TimeProvider? timeProvider = null
    )
    {
        List<Claim> claims = [];
        const string issuer = "https://test.maskinporten.no/";
        claims.Add(new Claim(JwtClaimTypes.Issuer, issuer, ClaimValueTypes.String, issuer));
        claims.Add(new Claim(JwtClaimTypes.Scope, scope, ClaimValueTypes.String, issuer));
        claims.Add(new Claim(JwtClaimTypes.JwtId, Guid.NewGuid().ToString(), ClaimValueTypes.String, issuer));
        claims.Add(new Claim(JwtClaimTypes.Maskinporten.AuthenticationMethod, "Mock", ClaimValueTypes.String, issuer));

        ClaimsIdentity identity = new("mock");
        identity.AddClaims(claims);
        ClaimsPrincipal principal = new(identity);
        expiry ??= TimeSpan.FromMinutes(2);
        string accessToken = JwtTokenMock.GenerateToken(principal, expiry.Value, timeProvider);

        return new MaskinportenTokenResponse
        {
            AccessToken = JwtToken.Parse(accessToken),
            ExpiresIn = (int)expiry.Value.TotalSeconds,
            Scope = scope,
            TokenType = AuthorizationSchemes.Bearer,
        };
    }
}
