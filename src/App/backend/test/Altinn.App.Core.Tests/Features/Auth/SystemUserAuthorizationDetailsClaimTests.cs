using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using Altinn.App.Core.Features.Auth;
using static Altinn.App.Core.Features.Auth.Authenticated;

namespace Altinn.App.Core.Tests.Features.Auth;

public class SystemUserAuthorizationDetailsClaimTests
{
    private const string SystemUserId = "ebe4a681-0a8c-429e-a36f-8f9ca942b59f";
    private const string Org = """{"authority":"iso6523-actorid-upis","ID":"0192:310702641"}""";

    public static TheoryData<string, string> SystemUserClaims =>
        new()
        {
            {
                "type first",
                $$"""{"type":"urn:altinn:systemuser","systemuser_id":["{{SystemUserId}}"],"system_id":"s","systemuser_org":{{Org}}}"""
            },
            {
                "type last",
                $$"""{"systemuser_org":{{Org}},"systemuser_id":["{{SystemUserId}}"],"system_id":"s","type":"urn:altinn:systemuser"}"""
            },
            {
                "array of one, type last",
                $$"""[{"systemuser_id":["{{SystemUserId}}"],"system_id":"s","systemuser_org":{{Org}},"type":"urn:altinn:systemuser"}]"""
            },
        };

    [Theory]
    [MemberData(nameof(SystemUserClaims))]
    public void Parse_SystemUserClaim_ReturnsSystemUser(string description, string claim)
    {
        var systemUser = SystemUserAuthorizationDetailsClaim.Parse(JsonDocument.Parse(claim).RootElement);

        Assert.Equal(Guid.Parse(SystemUserId), Assert.Single(systemUser.SystemUserId));
        Assert.Equal("s", systemUser.SystemId);
        Assert.Equal("0192:310702641", systemUser.SystemUserOrg.Id);
        Assert.NotNull(description);
    }

    public static TheoryData<string, string> InvalidClaims =>
        new()
        {
            { "no type", $$"""{"systemuser_id":["{{SystemUserId}}"],"system_id":"s","systemuser_org":{{Org}}}""" },
            { "other type", $$"""{"type":"urn:altinn:other","systemuser_id":["{{SystemUserId}}"]}""" },
            { "type not a string", $$"""{"type":1,"systemuser_id":["{{SystemUserId}}"]}""" },
            { "system user id not a guid", """{"type":"urn:altinn:systemuser","systemuser_id":["not-a-guid"]}""" },
            { "array of two", $$"""[{"type":"urn:altinn:systemuser"},{"type":"urn:altinn:systemuser"}]""" },
            { "array of a string", """["urn:altinn:systemuser"]""" },
            { "string", "\"urn:altinn:systemuser\"" },
        };

    [Theory]
    [MemberData(nameof(InvalidClaims))]
    public void Parse_NotASystemUserClaim_ThrowsAuthenticationContextException(string description, string claim)
    {
        var exception = Assert.Throws<AuthenticationContextException>(() =>
            SystemUserAuthorizationDetailsClaim.Parse(JsonDocument.Parse(claim).RootElement)
        );

        Assert.Contains("systemuser token", exception.Message);
        Assert.NotNull(description);
    }

    [Fact]
    public void From_SystemUserTokenWithTypeLast_ReturnsSystemUser()
    {
        JwtPayload payload = TestAuthentication.GetSystemUserPayload(systemUserId: SystemUserId);
        payload["authorization_details"] = JsonDocument
            .Parse(
                $$"""{"systemuser_org":{{Org}},"systemuser_id":["{{SystemUserId}}"],"system_id":"{{TestAuthentication.DefaultSystemId}}","type":"urn:altinn:systemuser"}"""
            )
            .RootElement;
        string token = JwtTokenMock.GenerateToken(payload, TimeSpan.FromMinutes(2));

        var auth = Parse(token);

        var systemUser = Assert.IsType<SystemUser>(auth);
        Assert.Equal(Guid.Parse(SystemUserId), Assert.Single(systemUser.SystemUserId));
    }

    [Fact]
    public void From_SystemUserTokenWithoutType_ThrowsAuthenticationContextException()
    {
        JwtPayload payload = TestAuthentication.GetSystemUserPayload(systemUserId: SystemUserId);
        payload["authorization_details"] = JsonDocument
            .Parse(
                $$"""{"systemuser_org":{{Org}},"systemuser_id":["{{SystemUserId}}"],"system_id":"{{TestAuthentication.DefaultSystemId}}"}"""
            )
            .RootElement;
        string token = JwtTokenMock.GenerateToken(payload, TimeSpan.FromMinutes(2));

        Assert.Throws<AuthenticationContextException>(() => Parse(token));
    }

    [Fact]
    public void Serialize_WritesTypeFirst()
    {
        var claim = new SystemUserAuthorizationDetailsClaim(
            [Guid.Parse(SystemUserId)],
            "s",
            new OrgClaim("iso6523-actorid-upis", "0192:310702641")
        );

        string json = JsonSerializer.Serialize(claim);

        Assert.StartsWith("""{"type":"urn:altinn:systemuser",""", json);
        var parsed = SystemUserAuthorizationDetailsClaim.Parse(JsonDocument.Parse(json).RootElement);
        Assert.Equal(claim.SystemUserId, parsed.SystemUserId);
        Assert.Equal(claim.SystemId, parsed.SystemId);
        Assert.Equal(claim.SystemUserOrg, parsed.SystemUserOrg);
    }

    [Fact]
    public void From_UnauthenticatedTokenWithMalformedConsumer_ReturnsNone()
    {
        JwtPayload payload = TestAuthentication.GetSystemUserPayload(systemUserId: SystemUserId);
        payload["consumer"] = JsonDocument.Parse("""{"authority":1,"ID":["not","a","string"]}""").RootElement;
        string token = JwtTokenMock.GenerateToken(payload, TimeSpan.FromMinutes(2));

        var auth = Parse(token, isAuthenticated: false);

        Assert.IsType<None>(auth);
    }

    [Fact]
    public void From_SystemUserTokenWithMalformedConsumer_ThrowsAuthenticationContextException()
    {
        JwtPayload payload = TestAuthentication.GetSystemUserPayload(systemUserId: SystemUserId);
        payload["consumer"] = JsonDocument.Parse("""{"authority":1,"ID":["not","a","string"]}""").RootElement;
        string token = JwtTokenMock.GenerateToken(payload, TimeSpan.FromMinutes(2));

        var exception = Assert.Throws<AuthenticationContextException>(() => Parse(token));

        Assert.Contains("consumer claim", exception.Message);
    }

    private static Authenticated Parse(string token, bool isAuthenticated = true) =>
        Authenticated.From(
            token,
            null,
            isAuthenticated,
            TestAuthentication.NewApplicationMetadata(),
            getSelectedPartyCookieValues: () => throw new NotImplementedException(),
            getUserProfile: _ => throw new NotImplementedException(),
            lookupUserParty: _ => throw new NotImplementedException(),
            lookupOrgParty: _ => throw new NotImplementedException(),
            getPartyList: _ => throw new NotImplementedException(),
            validateSelectedParty: (_, __) => throw new NotImplementedException()
        );
}
