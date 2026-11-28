using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Tests.Features.Process;

/// <summary>
/// The result cases are internal, so an app's own tests compare a handler's result with what a factory returns.
/// </summary>
public class HandlerResultTests
{
    [Fact]
    public void Results_CompareByValue_AsAnAppsOwnTestComparesThem()
    {
        Assert.Equal(HandlerResult.Success(), HandlerResult.Success());
        Assert.Equal(HandlerResult.FailedPermanent("No archive"), HandlerResult.FailedPermanent("No archive"));
        Assert.NotEqual(HandlerResult.FailedPermanent("No archive"), HandlerResult.FailedRetryable("No archive"));
        Assert.NotEqual(HandlerResult.FailedPermanent("No archive"), HandlerResult.FailedPermanent("No receipt"));
        Assert.True(HandlerResult.Success() != HandlerResult.FailedRetryable("No archive"));
    }
}
