using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.Basic;

[Trait("Category", "Integration")]
public class BasicAppTests(ITestOutputHelper _output)
{
    [Fact]
    public async Task Instantiate()
    {
        await using var fixture = await AppFixture.Create(_output, TestApps.Basic);
        var verifier = fixture.ScopedVerifier;

        var token = await fixture.Auth.GetUserToken(userId: 1337);

        using var response = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );

        using var readResponse = await response.Read<Instance>();
        await verifier.Verify(
            readResponse,
            snapshotName: "Instantiation",
            scrubber: AppFixture.InstanceScrubber(readResponse)
        );

        await verifier.Verify(await fixture.GetSnapshotAppLogs(), snapshotName: "Logs");
    }

    [Fact]
    public async Task Instantiate_With_Prefill()
    {
        await using var fixture = await AppFixture.Create(_output, TestApps.Basic);
        var verifier = fixture.ScopedVerifier;

        var token = await fixture.Auth.GetUserToken(userId: 1337);

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance
            {
                InstanceOwner = new InstanceOwner { PartyId = "501337" },
                Prefill = new() { { "property1", "Testing" } },
            }
        );

        using var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        using var download = await fixture.Instances.Download(token, readInstantiationResponse);
        await download.Verify(verifier);

        await verifier.Verify(await fixture.GetSnapshotAppLogs(), snapshotName: "Logs");
    }

    [Fact]
    public async Task Full()
    {
        await using var fixture = await AppFixture.Create(_output, TestApps.Basic);
        var verifier = fixture.ScopedVerifier;

        var token = await fixture.Auth.GetUserToken(userId: 1337);

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance
            {
                InstanceOwner = new InstanceOwner { PartyId = "501337" },
                Prefill = new() { { "property1", "1" } },
            }
        );
        using var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        await verifier.Verify(
            readInstantiationResponse,
            snapshotName: "Instantiation",
            scrubber: AppFixture.InstanceScrubber(readInstantiationResponse)
        );

        var instance = readInstantiationResponse.Data.Model;
        Assert.NotNull(instance);
        var scrubber = AppFixture.InstanceScrubber(instance);

        var dataElement = instance.Data.First(d => d.DataType == "model");
        using var patchResponse = await fixture.Instances.PatchFormData(
            token,
            readInstantiationResponse,
            new DataPatchRequestMultiple
            {
                Patches =
                [
                    new(
                        DataElementId: Guid.Parse(dataElement.Id),
                        Patch: new JsonPatch(
                            PatchOperation.Test(JsonPointer.Create("property1"), JsonNode.Parse("\"1\"")),
                            PatchOperation.Replace(JsonPointer.Create("property1"), JsonNode.Parse("\"2\"")),
                            PatchOperation.Replace(JsonPointer.Create("property2"), JsonNode.Parse("\"1\""))
                        )
                    ),
                ],
                IgnoredValidators = null,
            }
        );
        using var readPatchResponse = await patchResponse.Read<DataPatchResponseMultiple>();
        await verifier.Verify(readPatchResponse, snapshotName: "PatchFormData", scrubber: scrubber);

        using var processNextResponse = await fixture.Instances.ProcessNext(token, readInstantiationResponse);
        using var readProcessNextResponse = await processNextResponse.Read<AppProcessState>();
        await verifier.Verify(readProcessNextResponse, snapshotName: "ProcessNext", scrubber: scrubber);

        using var download = await fixture.Instances.Download(token, readInstantiationResponse);
        await download.Verify(verifier);

        await verifier.Verify(await fixture.GetSnapshotAppLogs(), snapshotName: "Logs");
    }
}
