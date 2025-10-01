using Altinn.App.Api.Models;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.PartyTypesAllowed;

[Trait("Category", "Integration")]
public class SubunitOnlyAppTests(ITestOutputHelper _output, AppFixtureClassFixture _classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Theory]
    [InlineData("500000")] // Org: DDG Fitness AS
    [InlineData("500002")] // Subunit: DDG Fitness Oslo
    public async Task Instantiate(string partyId)
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic, "subunit-only");
        var fixture = fixtureScope.Fixture;
        var verifier = fixture.ScopedVerifier;
        verifier.UseTestCase(new { partyId });

        var token = await fixture.Auth.GetUserToken(userId: 1337);

        using var response = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = partyId } }
        );

        using var data = await response.Read<Instance>();
        await verifier.Verify(
            data,
            snapshotName: "Instance",
            scrubbers: new Scrubbers(StringScrubber: Scrubbers.InstanceStringScrubber(data))
        );

        await verifier.Verify(fixture.GetSnapshotAppLogs(), snapshotName: "Logs");
    }

    [Fact]
    public async Task ApplicationMetadata()
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic, "subunit-only");
        var fixture = fixtureScope.Fixture;
        var verifier = fixture.ScopedVerifier;

        using var response = await fixture.ApplicationMetadata.Get();

        Assert.True(response.Response.IsSuccessStatusCode);
        using var applicationMetadata = await response.Read<ApplicationMetadata>();
        await verifier.Verify<ApplicationMetadata>(applicationMetadata);

        await verifier.Verify(fixture.GetSnapshotAppLogs(), snapshotName: "Logs");
    }
}
