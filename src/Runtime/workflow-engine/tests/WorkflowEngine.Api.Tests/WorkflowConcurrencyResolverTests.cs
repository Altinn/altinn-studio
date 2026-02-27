using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Api.Tests;

public class WorkflowConcurrencyPolicyTests
{
    [Fact]
    public void Generic_DefaultsToUnrestricted()
    {
        Assert.Equal(ConcurrencyPolicy.Unrestricted, WorkflowType.Generic.GetConcurrencyPolicy());
    }

    [Fact]
    public void AppProcessChange_IsSingleActive()
    {
        Assert.Equal(ConcurrencyPolicy.SingleActive, WorkflowType.AppProcessChange.GetConcurrencyPolicy());
    }
}
