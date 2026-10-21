using Altinn.AccessManagement.Controllers;
using LocalTest.Configuration;
using LocalTest.Services.AccessManagement;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Xunit;

namespace LocalTest.Tests.AccessManagement;

/// <summary>
/// Access Management accepts a repeated grant and a repeated revocation, so an app that retries a delegation step
/// after a partial failure succeeds. Localtest models that contract so a local run behaves the way a deployed app
/// does.
/// </summary>
public sealed class AppsInstanceDelegationTests : IDisposable
{
    private const string ResourceId = "app_ttd_signing";
    private readonly Guid _instanceId = Guid.NewGuid();
    private readonly string _storagePath = Path.Join(
        Path.GetTempPath(),
        $"localtest-delegation-{Guid.NewGuid():N}"
    );
    private readonly LocalInstanceDelegationsRepository _repository;
    private readonly AppsInstanceDelegationController _controller;

    public AppsInstanceDelegationTests()
    {
        _repository = new LocalInstanceDelegationsRepository(
            Options.Create(new LocalPlatformSettings { LocalTestingStorageBasePath = _storagePath })
        );
        _controller = new AppsInstanceDelegationController(_repository);
    }

    public void Dispose()
    {
        _repository.Dispose();
        if (Directory.Exists(_storagePath))
        {
            Directory.Delete(_storagePath, recursive: true);
        }
    }

    [Fact]
    public async Task Grant_Repeated_SucceedsWithoutDuplicatingRights()
    {
        var request = Request("signee-a", Right("read"), Right("sign"));

        await Grant(request);
        await Grant(request);

        var stored = Assert.Single(await _repository.Read(_instanceId));
        Assert.Equal(["read", "sign"], stored.Rights.Select(right => right.Action.Value));
    }

    [Fact]
    public async Task Grant_AdditionalRights_KeepsTheRightsAlreadyDelegated()
    {
        await Grant(Request("signee-a", Right("read"), Right("sign")));

        var response = await Grant(Request("signee-a", Right("sign", "Task_2")));

        Assert.Equal(["sign"], response.Rights.Select(right => right.Action.Value));
        var stored = Assert.Single(await _repository.Read(_instanceId));
        Assert.Equal(3, stored.Rights.Count());
        Assert.Contains(stored.Rights, right => right.Resource.Contains(TaskResource("Task_2")));
    }

    [Fact]
    public async Task Grant_SameRightWithReorderedResource_IsNotDuplicated()
    {
        await Grant(Request("signee-a", Right("sign")));
        var reordered = Right("sign");
        reordered.Resource = reordered.Resource.Reverse().ToArray();

        await Grant(Request("signee-a", reordered));

        var stored = Assert.Single(await _repository.Read(_instanceId));
        Assert.Single(stored.Rights);
    }

    [Fact]
    public async Task Grant_Concurrent_KeepsEveryRight()
    {
        await Task.WhenAll(
            Grant(Request("signee-a", Right("read"))),
            Grant(Request("signee-a", Right("sign"))),
            Grant(Request("signee-a", Right("write")))
        );

        var stored = Assert.Single(await _repository.Read(_instanceId));
        Assert.Equal(["read", "sign", "write"], stored.Rights.Select(right => right.Action.Value).Order());
    }

    [Fact]
    public async Task Revoke_SomeRights_KeepsTheOthers()
    {
        await Grant(Request("signee-a", Right("read"), Right("sign")));
        await Grant(Request("signee-a", Right("read", "Task_2"), Right("sign", "Task_2")));

        await Revoke(Request("signee-a", Right("read"), Right("sign")));

        var stored = Assert.Single(await _repository.Read(_instanceId));
        Assert.All(stored.Rights, right => Assert.Contains(TaskResource("Task_2"), right.Resource));
        Assert.Equal(2, stored.Rights.Count());
    }

    [Fact]
    public async Task Revoke_RepeatedOrNeverGranted_Succeeds()
    {
        var request = Request("signee-a", Right("read"), Right("sign"));
        await Grant(request);

        await Revoke(request);
        await Revoke(request);
        await Revoke(Request("signee-b", Right("sign")));

        Assert.Empty(await _repository.Read(_instanceId));
        Assert.Empty(Directory.GetFiles(Path.Join(_storagePath, "instanceDelegations")));
    }

    private async Task<AppsInstanceDelegationResponseDto> Grant(AppsInstanceDelegationRequestDto request)
    {
        var result = await _controller.Delegation(request, ResourceId, _instanceId.ToString());
        return Assert.IsType<AppsInstanceDelegationResponseDto>(Assert.IsType<OkObjectResult>(result).Value);
    }

    private async Task Revoke(AppsInstanceDelegationRequestDto request)
    {
        var result = await _controller.Revoke(request, ResourceId, _instanceId.ToString());
        Assert.IsType<OkObjectResult>(result);
    }

    private static AppsInstanceDelegationRequestDto Request(string signee, params RightDto[] rights) =>
        new()
        {
            From = new UrnValue("urn:altinn:party:uuid", "instance-owner"),
            To = new UrnValue("urn:altinn:party:uuid", signee),
            Rights = rights,
        };

    private static RightDto Right(string action, string taskId = "Task_1") =>
        new()
        {
            Action = new UrnValue("urn:altinn:action", action),
            Resource =
            [
                new UrnValue("urn:altinn:org", "ttd"),
                new UrnValue("urn:altinn:app", "signing"),
                TaskResource(taskId),
            ],
        };

    private static UrnValue TaskResource(string taskId) => new("urn:altinn:task", taskId);
}
