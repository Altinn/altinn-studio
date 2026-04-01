using WorkflowEngine.App.Commands.AppCommand;

namespace WorkflowEngine.App.Tests.Commands.AppCommand;

public class InstanceInformationTests
{
    [Fact]
    public void FromContext_ExtractsAllFields()
    {
        var instanceGuid = Guid.NewGuid();
        var context = new AppWorkflowContext
        {
            Actor = new Actor { UserIdOrOrgNumber = "user-1" },
            LockToken = "lock-1",
            Org = "ttd",
            App = "my-app",
            InstanceOwnerPartyId = 50001,
            InstanceGuid = instanceGuid,
        };

        var info = InstanceInformation.FromContext(context);

        Assert.Equal("ttd", info.Org);
        Assert.Equal("my-app", info.App);
        Assert.Equal(50001, info.InstanceOwnerPartyId);
        Assert.Equal(instanceGuid, info.InstanceGuid);
    }
}
