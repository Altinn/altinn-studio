using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.Basic;

[Trait("Category", "Integration")]
public class BasicAppTests(ITestOutputHelper _output, AppFixtureClassFixture _classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    public enum TestCase
    {
        SimplifiedNoPrefill,
        SimplifiedWithPrefill,
        MultipartNoPrefill,
        MultipartJsonPrefill, // Should error, allowedContentType does not allow application/json
        MultipartXmlPrefill,
    }

    private static bool HasPrefill(TestCase testCase) =>
        testCase is TestCase.SimplifiedWithPrefill or TestCase.MultipartJsonPrefill or TestCase.MultipartXmlPrefill;

    [Theory]
    [CombinatorialData]
    public async Task Full(TestCase testCase)
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        var verifier = fixture.ScopedVerifier;
        verifier.UseTestCase(new { testCase });

        // TODO: parameterize auth
        var token = await fixture.Auth.GetUserToken(userId: 1337);

        // Create instance based on testcase
        using var instantiationResponse = await CreateInstance(fixture, token, testCase);
        using var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        // Verifies the instantiation response
        await verifier.Verify(
            readInstantiationResponse,
            snapshotName: "Instantiation",
            scrubbers: new Scrubbers(StringScrubber: Scrubbers.InstanceStringScrubber(readInstantiationResponse))
        );
        // Verify state of datamodels after instantiation (prefill)
        using var download1 = await fixture.Instances.Download(token, readInstantiationResponse);
        await download1.Verify(verifier, skipInstanceInSnapshot: true); // Since we snapshot the instantiation above

        if (testCase is TestCase.MultipartJsonPrefill)
            return; // AllowedContentType does not allow application/json, so we expect an error in the above response

        var instance = readInstantiationResponse.Data.Model;
        Assert.NotNull(instance);
        var scrubbers = new Scrubbers(StringScrubber: Scrubbers.InstanceStringScrubber(instance));

        var dataElement = instance.Data.First(d => d.DataType == "model");
        var initialValue = HasPrefill(testCase) ? "\"1\"" : "null";
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
                            PatchOperation.Test(JsonPointer.Create("property1"), JsonNode.Parse(initialValue)),
                            PatchOperation.Replace(JsonPointer.Create("property1"), JsonNode.Parse("\"2\"")),
                            PatchOperation.Replace(JsonPointer.Create("property2"), JsonNode.Parse("\"2\""))
                        )
                    ),
                ],
                IgnoredValidators = null,
            }
        );
        using var readPatchResponse = await patchResponse.Read<DataPatchResponseMultiple>();
        await verifier.Verify(readPatchResponse, snapshotName: "PatchFormData", scrubbers: scrubbers);

        using var processNextResponse = await fixture.Instances.ProcessNext(token, readInstantiationResponse);
        using var readProcessNextResponse = await processNextResponse.Read<AppProcessState>();
        await verifier.Verify(readProcessNextResponse, snapshotName: "ProcessNext", scrubbers: scrubbers);

        using var download2 = await fixture.Instances.Download(token, readInstantiationResponse);
        await download2.Verify(verifier);

        await verifier.Verify(await fixture.GetSnapshotAppLogs(), snapshotName: "Logs");
    }

    private static async Task<AppFixture.ApiResponse> CreateInstance(
        AppFixture fixture,
        string token,
        TestCase testCase
    )
    {
        return testCase switch
        {
            TestCase.SimplifiedNoPrefill => await fixture.Instances.PostSimplified(
                token,
                new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
            ),
            TestCase.SimplifiedWithPrefill => await fixture.Instances.PostSimplified(
                token,
                new InstansiationInstance
                {
                    InstanceOwner = new InstanceOwner { PartyId = "501337" },
                    Prefill = new() { { "property1", "1" }, { "property2", "1" } },
                }
            ),
            TestCase.MultipartNoPrefill => await fixture.Instances.PostMultipart(
                token,
                instanceTemplate: new Instance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
            ),
            TestCase.MultipartJsonPrefill => await fixture.Instances.PostMultipart(
                token,
                instanceTemplate: new Instance { InstanceOwner = new InstanceOwner { PartyId = "501337" } },
                dataParts: new Dictionary<string, (string, string)>
                {
                    ["model"] = ("{\"property1\":\"1\",\"property2\":\"1\"}", "application/json"),
                }
            ),
            TestCase.MultipartXmlPrefill => await fixture.Instances.PostMultipart(
                token,
                instanceTemplate: new Instance { InstanceOwner = new InstanceOwner { PartyId = "501337" } },
                dataParts: new Dictionary<string, (string, string)>
                {
                    ["model"] = (
                        """<model><property1>1</property1><property2>1</property2></model>""",
                        "application/xml"
                    ),
                }
            ),
            _ => throw new ArgumentOutOfRangeException(nameof(testCase)),
        };
    }
}
