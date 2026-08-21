using System.IdentityModel.Tokens.Jwt;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.CustomScopes;

[Trait("Category", "Integration")]
public class CustomScopesTests(ITestOutputHelper _output, AppFixtureClassFixture _classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    public enum Auth
    {
        User,
        ServiceOwner,
        SystemUser,
        SelfIdentifiedUser,
    }

    [Theory]
    // Here the `altinn:` scopes should end in forbidden while the `custom:` scopes should work
    // since the scenario configures them.
    [InlineData(Auth.User, "altinn:portal/enduser")]
    [InlineData(Auth.User, "altinn:instances.read altinn:instances.write")]
    [InlineData(Auth.User, "custom:instances.read custom:instances.write")]
    [InlineData(Auth.SystemUser, "altinn:instances.read altinn:instances.write")]
    [InlineData(Auth.SystemUser, "custom:instances.read custom:instances.write")]
    [InlineData(Auth.ServiceOwner, "altinn:serviceowner/instances.read altinn:serviceowner/instances.write")]
    [InlineData(Auth.ServiceOwner, "custom:serviceowner/instances.read custom:serviceowner/instances.write")]
    public async Task Full(Auth auth, string scope)
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic, scenario: "custom-scopes");
        var fixture = fixtureScope.Fixture;
        var verifier = fixture.ScopedVerifier;
        // sanitizedScope must be valid part of path on e.g. Windows. Variable is used in spanshot filename
        var sanitizedScope = scope.Replace(':', '-').Replace(' ', '-').Replace('/', '-');
        verifier.UseTestCase(new { auth, scope = sanitizedScope });

        var token = auth switch
        {
            Auth.User => await fixture.Auth.GetUserToken(userId: 1337, scope: scope),
            Auth.SystemUser => await fixture.Auth.GetSystemUserToken(
                "913312465_sbs",
                "d111dbab-d619-4f15-bf29-58fe570a9ae6",
                scope: scope
            ),
            Auth.ServiceOwner => await fixture.Auth.GetServiceOwnerToken(scope: scope),
            _ => throw new ArgumentOutOfRangeException(nameof(auth)),
        };
        var handler = new JwtSecurityTokenHandler();
        var tokenObj = handler.ReadJwtToken(token);
        await verifier.Verify(tokenObj.Payload, snapshotName: "Token").ScrubMembers("exp", "nbf", "iat");

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

    [Theory]
    [InlineData(Auth.User, "custom:instances.read")]
    [InlineData(Auth.User, "custom:instances.write")]
    [InlineData(Auth.ServiceOwner, "custom:serviceowner/instances.read")]
    [InlineData(Auth.ServiceOwner, "custom:serviceowner/instances.write")]
    public async Task IndividualScopes(Auth auth, string scope)
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic, scenario: "custom-scopes");
        var fixture = fixtureScope.Fixture;
        var verifier = fixture.ScopedVerifier;
        // sanitizedScope must be valid part of path on e.g. Windows. Variable is used in spanshot filename
        var sanitizedScope = scope.Replace(':', '-').Replace(' ', '-').Replace('/', '-');
        verifier.UseTestCase(new { auth, scope = sanitizedScope });

        var token = auth switch
        {
            Auth.User => await fixture.Auth.GetUserToken(userId: 1337, scope: scope),
            Auth.ServiceOwner => await fixture.Auth.GetServiceOwnerToken(scope: scope),
            _ => throw new ArgumentOutOfRangeException(nameof(auth)),
        };

        await Apis.Call(fixture, verifier, token, instantiationData: null);
    }

    [Fact]
    public async Task Metadata_Custom()
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic, scenario: "custom-scopes");
        var fixture = fixtureScope.Fixture;
        var verifier = fixture.ScopedVerifier;

        var token = await fixture.Auth.GetUserToken(userId: 1337, scope: "custom:instances.read");
        using var metadataResponse = await fixture.Generic.Get(
            $"/ttd/{fixture.App}/api/testing/authorization/metadata",
            token
        );
        using var metadataContent = await metadataResponse.Read<Argon.JToken>();
        await verifier.Verify(metadataContent, snapshotName: "Metadata", scrubbers: null);
    }

    [Fact]
    public async Task Metadata_Standard()
    {
        await using var fixture = await AppFixture.Create(_output, TestApps.Basic);
        var verifier = fixture.ScopedVerifier;

        var token = await fixture.Auth.GetUserToken(userId: 1337, scope: "altinn:portal/enduser");
        using var metadataResponse = await fixture.Generic.Get(
            $"/ttd/{fixture.App}/api/testing/authorization/metadata",
            token
        );
        using var metadataContent = await metadataResponse.Read<Argon.JToken>();
        await verifier.Verify(metadataContent, snapshotName: "Metadata", scrubbers: null);
    }
}
