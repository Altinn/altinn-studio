using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.InstanceLocking;

[Trait("Category", "Integration")]
public sealed class InstanceLockTests(ITestOutputHelper _output, AppFixtureClassFixture _classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task ProcessNext_ConcurrentRequests_OneRequestGetsConflict()
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic, "instance-lock");
        var fixture = fixtureScope.Fixture;

        var client = fixture.GetAppClient();

        var resetResponse = await client.PostAsync("/test/instance-lock/reset", null);
        resetResponse.EnsureSuccessStatusCode();

        var token = await fixture.Auth.GetUserToken(userId: 1337);

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        var instance = readInstantiationResponse.Data.Model;
        Assert.NotNull(instance);

        Task<AppFixture.ApiResponse>[] processNextTasks =
        [
            fixture.Instances.ProcessNext(token, readInstantiationResponse),
            fixture.Instances.ProcessNext(token, readInstantiationResponse),
        ];

        var conflictResponseTask = await Task.WhenAny(processNextTasks);
        using var conflictResponse = await conflictResponseTask;

        Assert.Equal(System.Net.HttpStatusCode.Conflict, conflictResponse.Response.StatusCode);

        var releaseResponse = await client.PostAsync("/test/instance-lock/release-wait", null);
        releaseResponse.EnsureSuccessStatusCode();

        using var successRequestResponse = await processNextTasks.First(x => x != conflictResponseTask);

        successRequestResponse.Response.EnsureSuccessStatusCode();
    }
}
