using Altinn.AccessManagement.Controllers;
using LocalTest.Configuration;
using LocalTest.Services.AccessManagement;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Xunit;

namespace LocalTest.Tests;

public sealed class AppsInstanceDelegationTests : IDisposable
{
    private const string ResourceId = "app_ttd_signing";
    private readonly Guid _instanceId = Guid.NewGuid();
    private readonly string _storagePath = Path.Join(Path.GetTempPath(), $"localtest-delegation-{Guid.NewGuid():N}");
    private readonly LocalInstanceDelegationsRepository _repository;
    private readonly AppsInstanceDelegationController _controller;

    public AppsInstanceDelegationTests()
    {
        _repository = new LocalInstanceDelegationsRepository(Options.Create(new LocalPlatformSettings
        {
            LocalTestingStorageBasePath = _storagePath
        }));
        _controller = new AppsInstanceDelegationController(_repository);
    }

    [Fact]
    public async Task Delegation_RepeatedGrant_ReturnsSuccessWithoutDuplicatingRights()
    {
        var request = Request("signee-a", Right("read"), Right("sign"));

        await Grant(request);
        await Grant(request);

        var stored = Assert.Single(await _repository.Read(_instanceId));
        Assert.Equal(new[] { "read", "sign" }, stored.Rights.Select(right => right.Action.Value));
        Assert.Single(Directory.GetFiles(Path.Join(_storagePath, "instanceDelegations")));
    }

    [Fact]
    public async Task Delegation_AdditionalRights_PreservesExistingRightsAndReturnsOnlyRequestedRights()
    {
        await Grant(Request("signee-a", Right("read"), Right("sign")));

        var response = await Grant(Request("signee-a", Right("write"), Right("sign", "Task_2")));

        Assert.Equal(new[] { "write", "sign" }, response.Rights.Select(right => right.Action.Value));
        var stored = Assert.Single(await _repository.Read(_instanceId));
        Assert.Equal(new[] { "read", "sign", "write", "sign" }, stored.Rights.Select(right => right.Action.Value));
        Assert.Contains(stored.Rights, right => right.Action.Value == "sign" && right.Resource.Contains(new UrnValue("urn:altinn:task", "Task_1")));
        Assert.Contains(stored.Rights, right => right.Action.Value == "sign" && right.Resource.Contains(new UrnValue("urn:altinn:task", "Task_2")));
    }

    [Fact]
    public async Task Delegation_ReorderedResourceAttributes_DoesNotDuplicateRight()
    {
        await Grant(Request("signee-a", Right("sign")));
        var repeated = Right("sign");
        repeated.Resource = repeated.Resource.Reverse().ToArray();

        await Grant(Request("signee-a", repeated));

        var stored = Assert.Single(await _repository.Read(_instanceId));
        Assert.Single(stored.Rights);
    }

    [Fact]
    public async Task Delegation_ConcurrentAdditionalGrants_PreservesEveryRight()
    {
        await Task.WhenAll(
            Grant(Request("signee-a", Right("read"))),
            Grant(Request("signee-a", Right("sign"))),
            Grant(Request("signee-a", Right("write"))));

        var stored = Assert.Single(await _repository.Read(_instanceId));
        Assert.Equal(new[] { "read", "sign", "write" }, stored.Rights.Select(right => right.Action.Value).Order());
    }

    [Fact]
    public async Task Delegation_RetryAfterPartialBatchFailure_CompletesRemainingGrants()
    {
        // Signee initialization persists its progress after the whole batch. If the second grant fails,
        // the next attempt repeats the first grant even though Access Management already saved it.
        await Assert.ThrowsAsync<HttpRequestException>(() => Attempt(failSecondGrant: true));
        Assert.Single(await _repository.Read(_instanceId));

        await Attempt(failSecondGrant: false);

        var stored = await _repository.Read(_instanceId);
        Assert.Equal(new[] { "signee-a", "signee-b" }, stored.Select(delegation => delegation.To.Value).Order());
        Assert.All(stored, delegation => Assert.Equal(2, delegation.Rights.Count()));

        async Task Attempt(bool failSecondGrant)
        {
            await Grant(Request("signee-a", Right("read"), Right("sign")));
            if (failSecondGrant)
            {
                throw new HttpRequestException("The second grant timed out.");
            }
            await Grant(Request("signee-b", Right("read"), Right("sign")));
        }
    }

    [Fact]
    public async Task Revoke_RepeatedTaskRevocation_PreservesOtherTaskRights()
    {
        await Grant(Request("signee-a", Right("read"), Right("sign"), Right("write")));
        await Grant(Request("signee-a", Right("read", "Task_2"), Right("sign", "Task_2")));
        var requestedRight = Right("read");
        requestedRight.Resource = requestedRight.Resource.Reverse().ToArray();
        var request = Request("signee-a", requestedRight, Right("sign"));

        var response = await Revoke(request);
        await Revoke(request);

        Assert.Equal(new[] { "read", "sign" }, response.Rights.Select(right => right.Action.Value));
        var stored = Assert.Single(await _repository.Read(_instanceId));
        Assert.Equal(3, stored.Rights.Count());
        Assert.Contains(stored.Rights, right => right.Action.Value == "write" && right.Resource.Contains(new UrnValue("urn:altinn:task", "Task_1")));
        Assert.Equal(new[] { "read", "sign" }, stored.Rights
            .Where(right => right.Resource.Contains(new UrnValue("urn:altinn:task", "Task_2")))
            .Select(right => right.Action.Value));
    }

    [Fact]
    public async Task Revoke_AllRights_RemovesDelegationAndAcceptsRepeat()
    {
        var request = Request("signee-a", Right("read"), Right("sign"));
        await Grant(request);

        await Revoke(request);
        await Revoke(request);

        Assert.Empty(await _repository.Read(_instanceId));
        Assert.Empty(Directory.GetFiles(Path.Join(_storagePath, "instanceDelegations")));
    }

    [Fact]
    public async Task Revoke_ConcurrentAdditionalGrant_PreservesOnlyUnrevokedRights()
    {
        var request = Request("signee-a", Right("read"), Right("sign"));
        await Grant(request);

        await Task.WhenAll(
            Grant(Request("signee-a", Right("sign", "Task_2"))),
            Revoke(request));

        var stored = Assert.Single(await _repository.Read(_instanceId));
        var right = Assert.Single(stored.Rights);
        Assert.Equal("sign", right.Action.Value);
        Assert.Contains(new UrnValue("urn:altinn:task", "Task_2"), right.Resource);
    }

    private async Task<AppsInstanceDelegationResponseDto> Revoke(AppsInstanceDelegationRequestDto request)
    {
        var result = await _controller.Revoke(request, ResourceId, _instanceId.ToString());
        return Assert.IsType<AppsInstanceDelegationResponseDto>(Assert.IsType<OkObjectResult>(result).Value);
    }

    private async Task<AppsInstanceDelegationResponseDto> Grant(AppsInstanceDelegationRequestDto request)
    {
        var result = await _controller.Delegation(request, ResourceId, _instanceId.ToString());
        var response = Assert.IsType<AppsInstanceDelegationResponseDto>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.All(response.Rights, right => Assert.Equal(DelegationStatusExternal.Delegated, right.Status));
        return response;
    }

    private static AppsInstanceDelegationRequestDto Request(string signee, params RightDto[] rights) => new()
    {
        From = new UrnValue("urn:altinn:party:uuid", "instance-owner"),
        To = new UrnValue("urn:altinn:party:uuid", signee),
        Rights = rights
    };

    private static RightDto Right(string action, string taskId = "Task_1") => new()
    {
        Action = new UrnValue("urn:altinn:action", action),
        Resource =
        [
            new UrnValue("urn:altinn:org", "ttd"),
            new UrnValue("urn:altinn:app", "signing"),
            new UrnValue("urn:altinn:task", taskId)
        ]
    };

    public void Dispose()
    {
        _repository.Dispose();
        if (Directory.Exists(_storagePath))
        {
            Directory.Delete(_storagePath, recursive: true);
        }
    }
}
