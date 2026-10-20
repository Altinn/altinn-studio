using System.Net;
using System.Runtime.CompilerServices;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.AuthenticationLevel;

/// <summary>
/// policy.xml requires level 4 and has no system user obligation.
/// </summary>
[Trait("Category", "Integration")]
[Collection(IntegrationTestCollections.Pdf)]
public class Level4PolicyTests(ITestOutputHelper _output, AppFixtureClassFixture _classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Theory]
    [CombinatorialData]
    public async Task Full(Auth auth) =>
        await AuthenticationLevelObligation.Full(
            _output,
            _classFixture,
            "authlevel-4",
            auth,
            permitted: auth == Auth.UserLevel4
        );
}

/// <summary>
/// policy.xml requires level 4, relaxed to level 3 for system users.
/// </summary>
[Trait("Category", "Integration")]
[Collection(IntegrationTestCollections.Pdf)]
public class Level4SystemUserPolicyTests(ITestOutputHelper _output, AppFixtureClassFixture _classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Theory]
    [CombinatorialData]
    public async Task Full(Auth auth) =>
        await AuthenticationLevelObligation.Full(
            _output,
            _classFixture,
            "authlevel-4-systemuser",
            auth,
            permitted: auth != Auth.UserLevel3
        );
}

public enum Auth
{
    SystemUser,
    UserLevel3,
    UserLevel4,
}

/// <summary>
/// Runs the app and localtest with a policy.xml that requires authentication level 4. A system user is always
/// level 3, so it is only let in when the policy relaxes the requirement for system users with
/// <c>urn:altinn:minimum-authenticationlevel-systemuser</c>. The obligation is enforced by Altinn.Common.PEP in
/// the app and in localtest's storage emulation, and localtest's PDP has to carry it over to the policy it builds
/// for the system user, so this covers the whole local stack.
/// One class fixture serves one scenario, so each policy has its own test class above and the flow lives here.
/// </summary>
internal static class AuthenticationLevelObligation
{
    public static async Task Full(
        ITestOutputHelper output,
        AppFixtureClassFixture classFixture,
        string scenario,
        Auth auth,
        bool permitted,
        [CallerFilePath] string sourceFile = ""
    )
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic, scenario: scenario);
        var fixture = fixtureScope.Fixture;
        var verifier = fixture.ScopedVerifier;
        verifier.UseTestCase(new { auth });

        var token = auth switch
        {
            Auth.SystemUser => await fixture.Auth.GetSystemUserToken(
                "913312465_sbs",
                "d111dbab-d619-4f15-bf29-58fe570a9ae6"
            ),
            Auth.UserLevel3 => await fixture.Auth.GetUserToken(userId: 1337, authenticationLevel: 3),
            Auth.UserLevel4 => await fixture.Auth.GetUserToken(userId: 1337, authenticationLevel: 4),
            _ => throw new ArgumentOutOfRangeException(nameof(auth)),
        };

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );

        if (!permitted)
        {
            // The 403 body names the level the caller failed to meet
            Assert.Equal(HttpStatusCode.Forbidden, instantiationResponse.Response.StatusCode);
            using var readForbiddenResponse = await instantiationResponse.Read<Argon.JToken>();
            await verifier.Verify(
                readForbiddenResponse,
                snapshotName: "Instantiation",
                scrubbers: null,
                sourceFile: sourceFile
            );
            return;
        }

        Assert.Equal(HttpStatusCode.Created, instantiationResponse.Response.StatusCode);
        using var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        await verifier.Verify(
            readInstantiationResponse,
            snapshotName: "Instantiation",
            scrubbers: new Scrubbers(StringScrubber: Scrubbers.InstanceStringScrubber(readInstantiationResponse)),
            sourceFile: sourceFile
        );

        var instance = readInstantiationResponse.Data.Model;
        Assert.NotNull(instance);
        var scrubbers = new Scrubbers(StringScrubber: Scrubbers.InstanceStringScrubber(instance));

        // Read goes through localtest's storage emulation as well as the app
        using var getResponse = await fixture.Instances.Get(token, readInstantiationResponse);
        Assert.Equal(HttpStatusCode.OK, getResponse.Response.StatusCode);

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
                            PatchOperation.Replace(JsonPointer.Create("property1"), JsonNode.Parse("\"2\"")),
                            PatchOperation.Replace(JsonPointer.Create("property2"), JsonNode.Parse("\"2\""))
                        )
                    ),
                ],
                IgnoredValidators = null,
            }
        );
        Assert.Equal(HttpStatusCode.OK, patchResponse.Response.StatusCode);
        using var readPatchResponse = await patchResponse.Read<DataPatchResponseMultiple>();
        var patchedInstance = readPatchResponse.Data.Model?.Instance ?? instance;
        await verifier.Verify(
            readPatchResponse,
            snapshotName: "PatchFormData",
            scrubbers: new Scrubbers(StringScrubber: Scrubbers.InstanceStringScrubber(patchedInstance)),
            sourceFile: sourceFile
        );

        using var processNextResponse = await fixture.Instances.ProcessNext(token, readInstantiationResponse);
        Assert.Equal(HttpStatusCode.OK, processNextResponse.Response.StatusCode);
        using var readProcessNextResponse = await processNextResponse.Read<AppProcessState>();
        await verifier.Verify(
            readProcessNextResponse,
            snapshotName: "ProcessNext",
            scrubbers: scrubbers,
            sourceFile: sourceFile
        );
    }
}
