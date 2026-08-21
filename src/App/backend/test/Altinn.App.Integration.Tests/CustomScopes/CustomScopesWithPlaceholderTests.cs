using System.IdentityModel.Tokens.Jwt;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.CustomScopes;

[Trait("Category", "Integration")]
public class CustomScopesWithPlaceholderTests(ITestOutputHelper _output, AppFixtureClassFixture _classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    public enum Auth
    {
        User,
        ServiceOwner,
        SystemUser,
        SelfIdentifiedUser,
    }

    // csharpier-ignore
    public static TheoryData<Auth, string> TestData = new TheoryData<Auth, string>
        {
            { Auth.User, "custom:{app}/instances.read custom:{app}/instances.write" },
            { Auth.SystemUser, "custom:{app}/instances.read custom:{app}/instances.write" },
            { Auth.ServiceOwner, "custom:{app}/serviceowner/instances.read custom:{app}/serviceowner/instances.write" },
        };

    [Theory]
    [MemberData(nameof(TestData))]
    public async Task Full(Auth auth, string scope)
    {
        await using var fixtureScope = await _classFixture.Get(
            _output,
            TestApps.Basic,
            scenario: "custom-scopes-placeholders"
        );
        var fixture = fixtureScope.Fixture;
        var verifier = fixture.ScopedVerifier;
        var effectiveScope = scope.Replace("{app}", fixture.EffectiveApp);
        var snapshotScope = scope.Replace("{app}", fixture.App);
        // sanitizedScope must be valid part of path on e.g. Windows. Variable is used in spanshot filename
        var sanitizedScope = snapshotScope.Replace(':', '-').Replace(' ', '-').Replace('/', '-');
        verifier.UseTestCase(new { auth, scope = sanitizedScope });

        var token = auth switch
        {
            Auth.User => await fixture.Auth.GetUserToken(userId: 1337, scope: effectiveScope),
            Auth.SystemUser => await fixture.Auth.GetSystemUserToken(
                "913312465_sbs",
                "d111dbab-d619-4f15-bf29-58fe570a9ae6",
                scope: effectiveScope
            ),
            Auth.ServiceOwner => await fixture.Auth.GetServiceOwnerToken(scope: effectiveScope),
            _ => throw new ArgumentOutOfRangeException(nameof(auth)),
        };
        var handler = new JwtSecurityTokenHandler();
        var tokenObj = handler.ReadJwtToken(token);
        await verifier
            .Verify(tokenObj.Payload, snapshotName: "Token")
            .ScrubMembers("exp", "nbf", "iat")
            .AddScrubber(sb => sb.Replace(fixture.EffectiveApp, fixture.App));

        var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance
            {
                InstanceOwner = new InstanceOwner { PartyId = "501337" },
                Prefill = new() { { "property1", "1" }, { "property2", "1" } },
            }
        );
        using var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        // Verifies the instantiation response
        await verifier.Verify(
            readInstantiationResponse,
            snapshotName: "Instantiation",
            scrubbers: new Scrubbers(StringScrubber: Scrubbers.InstanceStringScrubber(readInstantiationResponse))
        );

        await Apis.Call(fixture, verifier, token, readInstantiationResponse);

        await verifier.VerifyLogs();
    }
}
