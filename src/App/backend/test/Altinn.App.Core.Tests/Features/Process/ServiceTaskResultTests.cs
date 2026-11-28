using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Tests.Features.Process;

/// <summary>
/// The result cases are internal, so an app's own tests compare a step's result with what a factory returns.
/// </summary>
public class ServiceTaskResultTests
{
    [Fact]
    public void Results_CompareByValue_AsAnAppsOwnTestComparesThem()
    {
        Assert.Equal(ServiceTaskResult.EndTask("reject"), ServiceTaskResult.EndTask("reject"));
        Assert.NotEqual(ServiceTaskResult.EndTask("reject"), ServiceTaskResult.EndTask("accept"));
        Assert.NotEqual(ServiceTaskResult.EndTask(), ServiceTaskResult.Completed());
        Assert.Equal(
            ServiceTaskResult.Defer(TimeSpan.FromMinutes(1), "Waiting for the archive"),
            ServiceTaskResult.Defer(TimeSpan.FromMinutes(1), "Waiting for the archive")
        );
        Assert.Equal(ServiceTaskResult.FailedPermanent("No receipt"), ServiceTaskResult.FailedPermanent("No receipt"));
        Assert.NotEqual(
            ServiceTaskResult.FailedPermanent("No receipt"),
            ServiceTaskResult.FailedRetryable("No receipt")
        );
        Assert.True(ServiceTaskReplyResult.EndTask("reject") == ServiceTaskResult.EndTask("reject"));
        Assert.True(ServiceTaskReplyResult.AwaitNextReply() == ServiceTaskReplyResult.AwaitNextReply());
    }
}
