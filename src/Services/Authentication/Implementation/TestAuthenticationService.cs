#nullable enable
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using AltinnCore.Authentication.Constants;
using LocalTest.Models.Authentication;
using LocalTest.Services.Authentication.Interface;
using LocalTest.Services.TestData;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Profile.Enums;

namespace LocalTest.Services.Authentication.Implementation;

public class TestAuthenticationService
{
    private readonly IAuthentication _authenticationService;
    private readonly TestDataService _testDataService;

    public const string DefaultServiceOwnerScope =
        "altinn:serviceowner/instances.read altinn:serviceowner/instances.write";
    public const string DefaultOrgScope = "altinn:instances.read altinn:instances.write";
    public const string DefaultUserScope = "altinn:portal/enduser";
    public const string DefaultIssuer = "https://platform.tt02.altinn.no/authentication/api/v1/openid/";

    public TestAuthenticationService(IAuthentication authenticationService, TestDataService testDataService)
    {
        _authenticationService = authenticationService;
        _testDataService = testDataService;
    }

    public async Task<string> GenerateToken(
        AuthenticationTypes type,
        int? userId = null,
        int? partyId = null,
        int authenticationLevel = 2,
        string? username = null,
        string? orgNumber = null,
        string? org = null,
        string? scope = null,
        string? systemId = null,
        string? systemUserId = null
    )
    {
        return type switch
        {
            AuthenticationTypes.User => await GetUserToken(userId, partyId, authenticationLevel),
            AuthenticationTypes.SelfIdentifiedUser => await GetSelfIdentifiedUserToken(username ?? throw new InvalidOperationException("Username is required for SelfIdentifiedUser tokens"), scope),
            AuthenticationTypes.Org => await GetOrgToken(orgNumber, scope ?? DefaultOrgScope),
            AuthenticationTypes.ServiceOwner => await GetServiceOwnerToken(orgNumber, scope ?? DefaultServiceOwnerScope, org),
            AuthenticationTypes.SystemUser => await GetSystemUserToken(
                systemId ?? throw new InvalidOperationException("SystemId is required for SystemUser tokens"),
                systemUserId ?? throw new InvalidOperationException("SystemUserId is required for SystemUser tokens"),
                scope),
            _ => throw new InvalidOperationException("Unsupported token type: " + type),
        };
    }

    public async Task<string> GetUserToken(
        int? userId = null,
        int? partyId = null,
        int authenticationLevel = 2,
        string? scope = null
    )
    {
        var testData = await _testDataService.GetTestData();
        
        // Validate and resolve userId and partyId
        var (actualUserId, actualPartyId) = ValidateAndResolveUserIds(testData, userId, partyId);

        var payload = GetUserPayload(actualUserId, actualPartyId, authenticationLevel, scope);
        return _authenticationService.GenerateToken(payload);
    }

    public static JwtPayload GetUserPayload(
        int userId,
        int partyId,
        int authLevel = 2,
        string? scope = null
    )
    {

        var payload = new JwtPayload
        {
            { "actual_iss", "localtest" },
            { ClaimTypes.NameIdentifier, userId.ToString() },
            { AltinnCoreClaimTypes.UserId, userId.ToString() },
            { AltinnCoreClaimTypes.PartyID, partyId.ToString() },
            { AltinnCoreClaimTypes.AuthenticateMethod, "BankID" },
            { AltinnCoreClaimTypes.AuthenticationLevel, authLevel },
            { "jti", Guid.NewGuid().ToString() },
            { "scope", scope ?? DefaultUserScope },
        };

        return payload;
    }

    public async Task<string> GetSelfIdentifiedUserToken(
        string username,
        string? scope = null
    )
    {
        var testData = await _testDataService.GetTestData();
        
        // Find user by username
        var user = testData.Profile.User.Values.FirstOrDefault(u => u.UserName == username);
        if (user is null)
        {
            var availableUsernames = testData.Profile.User.Values
                .Where(u => !string.IsNullOrEmpty(u.UserName))
                .Select(u => u.UserName)
                .ToList();
            throw new InvalidOperationException($"User with username '{username}' not found in test data. Available usernames: {string.Join(", ", availableUsernames)}");
        }

        if (user.UserType is not UserType.SelfIdentified)
        {
            throw new InvalidOperationException($"User with username '{username}' is not a self-identified user.");
        }

        var payload = GetSelfIdentifiedUserPayload(username, user.UserId, user.PartyId, scope);
        return _authenticationService.GenerateToken(payload);
    }

    public static JwtPayload GetSelfIdentifiedUserPayload(
        string username,
        int userId,
        int partyId,
        string? scope = null
    )
    {

        var payload = new JwtPayload
        {
            { "actual_iss", "localtest" },
            { ClaimTypes.NameIdentifier, userId.ToString() },
            { AltinnCoreClaimTypes.UserId, userId.ToString() },
            { AltinnCoreClaimTypes.UserName, username },
            { AltinnCoreClaimTypes.PartyID, partyId.ToString() },
            { AltinnCoreClaimTypes.AuthenticateMethod, "SelfIdentified" },
            { AltinnCoreClaimTypes.AuthenticationLevel, 0 },
            { "jti", Guid.NewGuid().ToString() },
            { "scope", scope ?? DefaultUserScope },
        };

        return payload;
    }

    public static JwtPayload GetOrgPayload(string orgNumber, string scope)
    {

        var scopes = new HashSet<string>(scope.Split(' ', StringSplitOptions.RemoveEmptyEntries));
        if (scopes.Any(s => s.StartsWith("altinn:serviceowner/")))
            throw new InvalidOperationException("Org token cannot have serviceowner scopes");

        var consumer = new OrgClaim(
            "iso6523-actorid-upis",
            $"0192:{orgNumber}"
        );

        var payload = new JwtPayload
        {
            { "iss", DefaultIssuer },
            { "actual_iss", "localtest" },
            { "scope", scope },
            { "token_type", "Bearer" },
            { "client_id", Guid.NewGuid().ToString() },
            { "consumer", JsonSerializer.SerializeToElement(consumer) },
            { AltinnCoreClaimTypes.OrgNumber, orgNumber },
            { AltinnCoreClaimTypes.AuthenticateMethod, "maskinporten" },
            { AltinnCoreClaimTypes.AuthenticationLevel, 3 },
            { "jti", Guid.NewGuid().ToString() },
        };

        return payload;
    }

    public async Task<string> GetOrgToken(
        string? orgNumber = null,
        string scope = DefaultOrgScope
    )
    {
        var testData = await _testDataService.GetTestData();
        var actualOrgNumber = ValidateAndResolveOrgNumber(testData, orgNumber);
        var payload = GetOrgPayload(actualOrgNumber, scope);
        return _authenticationService.GenerateToken(payload);
    }


    public async Task<string> GetServiceOwnerToken(
        string? orgNumber = null,
        string scope = DefaultServiceOwnerScope,
        string? org = null
    )
    {
        var testData = await _testDataService.GetTestData();
        var actualOrgNumber = ValidateAndResolveOrgNumber(testData, orgNumber);
        var actualOrg = org ?? throw new InvalidOperationException("Org code must be provided for service owner tokens");
        var payload = GetServiceOwnerPayload(actualOrgNumber, scope, actualOrg);
        return _authenticationService.GenerateToken(payload);
    }

    public static JwtPayload GetServiceOwnerPayload(
        string orgNumber,
        string scope,
        string org
    )
    {

        var scopes = new HashSet<string>(scope.Split(' ', StringSplitOptions.RemoveEmptyEntries));
        if (!scopes.Any(s => s.StartsWith("altinn:serviceowner/")))
            throw new InvalidOperationException("Service owner token must have serviceowner scopes");

        var consumer = new OrgClaim(
            "iso6523-actorid-upis",
            $"0192:{orgNumber}"
        );

        var payload = new JwtPayload
        {
            { "iss", DefaultIssuer },
            { "actual_iss", "localtest" },
            { "scope", scope },
            { "token_type", "Bearer" },
            { "client_id", Guid.NewGuid().ToString() },
            { "consumer", JsonSerializer.SerializeToElement(consumer) },
            { AltinnCoreClaimTypes.Org, org },
            { AltinnCoreClaimTypes.OrgNumber, orgNumber },
            { AltinnCoreClaimTypes.AuthenticateMethod, "maskinporten" },
            { AltinnCoreClaimTypes.AuthenticationLevel, 3 },
            { "jti", Guid.NewGuid().ToString() },
        };

        return payload;
    }

    public async Task<string> GetSystemUserToken(
        string systemId,
        string systemUserId,
        string? scope = null
    )
    {
        var testData = await _testDataService.GetTestData();
        
        // Find the system user by ID
        var systemUser = testData.Authorization.SystemUsers.Values.FirstOrDefault(su => su.Id == systemUserId);
        if (systemUser == null)
        {
            var availableSystemUsers = testData.Authorization.SystemUsers.Values.Select(su => su.Id).ToList();
            throw new InvalidOperationException($"SystemUser with ID '{systemUserId}' not found in test data. Available system users: {string.Join(", ", availableSystemUsers)}");
        }
        
        // Validate that the system user belongs to the specified system
        if (systemUser.SystemId != systemId)
        {
            throw new InvalidOperationException($"SystemUser '{systemUserId}' belongs to system '{systemUser.SystemId}', but '{systemId}' was requested");
        }
        
        // Get supplier org number from system ID
        var system = testData.Authorization.Systems.Values.FirstOrDefault(s => s.Id == systemId);
        if (system == null)
        {
            var availableSystems = testData.Authorization.Systems.Values.Select(s => s.Id).ToList();
            throw new InvalidOperationException($"System with ID '{systemId}' not found in test data. Available systems: {string.Join(", ", availableSystems)}");
        }
        
        var supplierOrgNumber = systemId.Split('_')[0];

        var payload = GetSystemUserPayload(systemId, systemUserId, systemUser.OrgNumber, supplierOrgNumber, scope ?? DefaultOrgScope);
        
        return _authenticationService.GenerateToken(payload);
    }

    public static JwtPayload GetSystemUserPayload(
        string systemId,
        string systemUserId,
        string systemUserOrgNumber,
        string supplierOrgNumber,
        string scope
    )
    {

        var scopes = new HashSet<string>(scope.Split(' ', StringSplitOptions.RemoveEmptyEntries));
        if (scopes.Any(s => s.StartsWith("altinn:serviceowner/")))
            throw new InvalidOperationException("System user tokens cannot have serviceowner scopes");

        var payload = new JwtPayload
        {
            { "iss", DefaultIssuer },
            { "actual_iss", "localtest" },
            { "token_type", "Bearer" },
            { "scope", scope },
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
                $"0192:{systemUserOrgNumber}"
            )
        );

        var consumer = new OrgClaim(
            "iso6523-actorid-upis",
            $"0192:{supplierOrgNumber}"
        );

        payload.Add("authorization_details", JsonSerializer.SerializeToElement(authorizationDetails));
        payload.Add("consumer", JsonSerializer.SerializeToElement(consumer));

        return payload;
    }


    public async Task<object> GetInfo()
    {
        var testData = await _testDataService.GetTestData();
        
        var info = new
        {
            AuthenticationTypes = new[]
            {
                new { Value = 1, Name = "User", Description = "Regular user with BankID authentication" },
                new { Value = 2, Name = "SelfIdentifiedUser", Description = "User without SSN/D-number" },
                new { Value = 3, Name = "Org", Description = "Organization token via Maskinporten" },
                new { Value = 4, Name = "SystemUser", Description = "System user token with authorization details" },
                new { Value = 5, Name = "ServiceOwner", Description = "Service owner token with special scopes" }
            },
            AvailableTestData = new
            {
                Users = testData.Profile.User.Values.Select(u => new { u.UserId, u.UserName, u.PartyId }).ToArray(),
                Organizations = testData.Register.Org.Keys.ToArray(),
                SystemUsers = testData.Authorization.SystemUsers.Values.Select(su => new { su.Id, su.SystemId, su.OrgNumber }).ToArray(),
                Systems = testData.Authorization.Systems.Values.Select(s => new { s.Id, s.Name }).ToArray()
            },
            DefaultScopes = new
            {
                ServiceOwner = DefaultServiceOwnerScope,
                Org = DefaultOrgScope,
                User = DefaultUserScope
            }
        };

        return info;
    }

    private static (int UserId, int PartyId) ValidateAndResolveUserIds(TestDataModel testData, int? userId, int? partyId)
    {
        var users = testData.Profile.User.Values.ToList();
        
        if (users.Count == 0)
        {
            throw new InvalidOperationException("No users found in test data");
        }

        // Case 1: Both userId and partyId provided - validate both exist and user can represent the party
        if (userId.HasValue && partyId.HasValue)
        {
            var user = users.FirstOrDefault(u => u.UserId == userId.Value);
            if (user is null)
            {
                throw new InvalidOperationException($"User with ID {userId.Value} not found in test data. Available users: {string.Join(", ", users.Select(u => u.UserId))}");
            }
            
            // Check if user can represent the requested party
            var userPartyList = testData.Authorization.PartyList.GetValueOrDefault(userId.Value.ToString(), new List<Party>());
            var canRepresentParty = userPartyList.Any(p => p.PartyId == partyId.Value);
            
            if (!canRepresentParty)
            {
                var availableParties = userPartyList.Select(p => p.PartyId).ToList();
                throw new InvalidOperationException($"User {userId.Value} cannot represent PartyId {partyId.Value}. Available parties for this user: {string.Join(", ", availableParties)}");
            }
            
            return (userId.Value, partyId.Value);
        }
        
        // Case 2: Only userId provided - find user and use their primary partyId (or first available party)
        if (userId.HasValue)
        {
            var user = users.FirstOrDefault(u => u.UserId == userId.Value);
            if (user is null)
            {
                throw new InvalidOperationException($"User with ID {userId.Value} not found in test data. Available users: {string.Join(", ", users.Select(u => u.UserId))}");
            }
            
            // Check if user has parties they can represent
            var userPartyList = testData.Authorization.PartyList.GetValueOrDefault(userId.Value.ToString(), new List<Party>());
            if (userPartyList.Count > 0)
            {
                // Use first party from party list (most common case)
                var firstParty = userPartyList.First();
                return (userId.Value, firstParty.PartyId);
            }
            else
            {
                // Fallback to user's own partyId if no party list exists
                return (userId.Value, user.PartyId);
            }
        }
        
        // Case 3: Only partyId provided - find a user who can represent that party
        if (partyId.HasValue)
        {
            // First check in party lists (users representing other parties)
            foreach (var kvp in testData.Authorization.PartyList)
            {
                if (int.TryParse(kvp.Key, out var userIdFromPartyList))
                {
                    var userParties = kvp.Value;
                    if (userParties.Any(p => p.PartyId == partyId.Value))
                    {
                        return (userIdFromPartyList, partyId.Value);
                    }
                }
            }
            
            // Fallback: check if any user has this as their own partyId
            var user = users.FirstOrDefault(u => u.PartyId == partyId.Value);
            if (user is not null)
            {
                return (user.UserId, partyId.Value);
            }
            
            // Get all available parties for better error message
            var allAvailableParties = new List<int>();
            allAvailableParties.AddRange(users.Select(u => u.PartyId));
            foreach (var partyList in testData.Authorization.PartyList.Values)
            {
                allAvailableParties.AddRange(partyList.Select(p => p.PartyId));
            }
            
            throw new InvalidOperationException($"No user found who can represent PartyId {partyId.Value}. Available parties: {string.Join(", ", allAvailableParties.Distinct().OrderBy(x => x))}");
        }
        
        // Case 4: Neither provided - use first available user and their first available party
        var firstUser = users.First();
        var firstUserPartyList = testData.Authorization.PartyList.GetValueOrDefault(firstUser.UserId.ToString(), new List<Party>());
        
        if (firstUserPartyList.Count > 0)
        {
            // Use first party from party list
            var firstParty = firstUserPartyList.First();
            return (firstUser.UserId, firstParty.PartyId);
        }
        else
        {
            // Use user's own partyId
            return (firstUser.UserId, firstUser.PartyId);
        }
    }

    private static string ValidateAndResolveOrgNumber(TestDataModel testData, string? orgNumber)
    {
        var availableOrgs = testData.Register.Org.Keys.ToList();
        
        if (availableOrgs.Count == 0)
        {
            throw new InvalidOperationException("No organizations found in test data");
        }

        // If orgNumber provided, validate it exists
        if (!string.IsNullOrEmpty(orgNumber))
        {
            if (!availableOrgs.Contains(orgNumber))
            {
                throw new InvalidOperationException($"Organization with number '{orgNumber}' not found in test data. Available organizations: {string.Join(", ", availableOrgs)}");
            }
            return orgNumber;
        }

        // If not provided, use first available
        return availableOrgs.First();
    }

}