using Altinn.App.Api.Models;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.PartyTypesAllowed;

[Trait("Category", "Integration")]
public class SubunitOnlyAppTests(ITestOutputHelper _output)
{
    [Theory]
    [InlineData("500000")] // Org: DDG Fitness AS
    [InlineData("500002")] // Subunit: DDG Fitness Oslo
    public async Task Instantiate(string partyId)
    {
        await using var fixture = await AppFixture.Create(_output, TestApps.Basic, "subunit-only");
        var verifier = fixture.ScopedVerifier;

        var token = await fixture.Auth.GetUserToken(userId: 1337);

        using var response = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = partyId } }
        );

        var data = await response.Read<Instance>();
        await verifier.Verify(
            data,
            parameters: new { partyId },
            snapshotName: "Instance",
            scrubber: AppFixture.InstanceScrubber(data)
        );

        await verifier.Verify(await fixture.GetSnapshotAppLogs(), parameters: new { partyId }, snapshotName: "Logs");
    }

    [Fact]
    public async Task ApplicationMetadata()
    {
        await using var fixture = await AppFixture.Create(_output, TestApps.Basic, "subunit-only");
        var verifier = fixture.ScopedVerifier;

        using var response = await fixture.ApplicationMetadata.Get();

        Assert.True(response.Response.IsSuccessStatusCode);
        var applicationMetadata = await response.Read<ApplicationMetadata>();
        await verifier.Verify<ApplicationMetadata>(applicationMetadata);

        await verifier.Verify(await fixture.GetSnapshotAppLogs(), snapshotName: "Logs");
    }
}
