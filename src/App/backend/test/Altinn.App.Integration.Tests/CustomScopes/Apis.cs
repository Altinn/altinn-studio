using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using Altinn.Platform.Storage.Interface.Models;
using static Altinn.App.Integration.Tests.AppFixture;

namespace Altinn.App.Integration.Tests.CustomScopes;

internal static class Apis
{
    public static async Task Call(
        AppFixture fixture,
        ScopedVerifier verifier,
        string token,
        ReadApiResponse<Instance>? instantiationData,
        [CallerFilePath] string sourceFile = ""
    )
    {
        // Test minimal API endpoints
        var instance = instantiationData?.Data.Model;
        var instanceGuid = instance?.Id is not null
            ? Guid.Parse(instance.Id.Split('/')[1])
            : Guid.Parse("12345678-1234-1234-1234-123456789012");
        var instanceOwnerPartyId = instance?.InstanceOwner?.PartyId ?? "501337";
        var scrubbers =
            instantiationData is not null && instance is not null
                ? new Scrubbers(StringScrubber: Scrubbers.InstanceStringScrubber(instantiationData))
                : null;

        // GET endpoint with instanceGuid - should be protected with read scope
        using var getInstanceResponse = await fixture.Generic.Get(
            $"/ttd/{fixture.App}/api/testing/authorization/{instanceGuid}",
            token
        );
        await verifier.Verify(
            getInstanceResponse,
            snapshotName: "GetInstanceGuid",
            scrubbers: scrubbers,
            sourceFile: sourceFile
        );

        // POST endpoint with instanceGuid - should be protected with write scope
        using var postInstanceResponse = await fixture.Generic.Post(
            $"/ttd/{fixture.App}/api/testing/authorization/{instanceGuid}",
            token,
            new StringContent("{}", MediaTypeHeaderValue.Parse("application/json"))
        );
        await verifier.Verify(
            postInstanceResponse,
            snapshotName: "PostInstanceGuid",
            scrubbers: scrubbers,
            sourceFile: sourceFile
        );

        // GET endpoint with instanceOwnerPartyId - should be protected with read scope
        using var getPartyResponse = await fixture.Generic.Get(
            $"/ttd/{fixture.App}/api/testing/authorization/{instanceOwnerPartyId}",
            token
        );
        await verifier.Verify(
            getPartyResponse,
            snapshotName: "GetInstanceOwnerPartyId",
            scrubbers: scrubbers,
            sourceFile: sourceFile
        );

        // POST endpoint with instanceOwnerPartyId - should be protected with write scope
        using var postPartyResponse = await fixture.Generic.Post(
            $"/ttd/{fixture.App}/api/testing/authorization/{instanceOwnerPartyId}",
            token,
            new StringContent("{}", MediaTypeHeaderValue.Parse("application/json"))
        );
        await verifier.Verify(
            postPartyResponse,
            snapshotName: "PostInstanceOwnerPartyId",
            scrubbers: scrubbers,
            sourceFile: sourceFile
        );

        // Anonymous endpoint - should NOT be protected
        using var getPublicResponse = await fixture.Generic.Get(
            $"/ttd/{fixture.App}/api/testing/authorization/public",
            token
        );
        await verifier.Verify(
            getPublicResponse,
            snapshotName: "GetPublic",
            scrubbers: scrubbers,
            sourceFile: sourceFile
        );
    }
}
