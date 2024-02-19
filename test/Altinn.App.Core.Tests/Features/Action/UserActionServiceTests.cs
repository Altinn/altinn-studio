using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Models.UserAction;
using FluentAssertions;
using Xunit;

namespace Altinn.App.Core.Tests.Features.Action;

public class UserActionServiceTests
{
    [Fact]
    public void GetActionHandlerOrDefault_should_return_DummyActionHandler_for_id_dummy()
    {
        var factory = new UserActionService(new List<IUserAction>() { new DummyUserAction() });

        IUserAction? userAction = factory.GetActionHandler("dummy");

        userAction.Should().NotBeNull();
        userAction.Should().BeOfType<DummyUserAction>();
        userAction!.Id.Should().Be("dummy");
    }
    
    [Fact]
    public void GetActionHandlerOrDefault_should_return_first_DummyActionHandler_for_id_dummy_if_multiple()
    {
        var factory = new UserActionService(new List<IUserAction>() { new DummyUserAction(), new DummyUserAction2() });

        IUserAction? userAction = factory.GetActionHandler("dummy");

        userAction.Should().NotBeNull();
        userAction.Should().BeOfType<DummyUserAction>();
        userAction!.Id.Should().Be("dummy");
    }
    
    [Fact]
    public void GetActionHandlerOrDefault_should_return_null_if_id_not_found_and_default_not_set()
    {
        var factory = new UserActionService(new List<IUserAction>() { new DummyUserAction() });

        IUserAction? userAction = factory.GetActionHandler("nonexisting");

        userAction.Should().BeNull();
    }
    
    [Fact]
    public void GetActionHandlerOrDefault_should_return_null_if_id_is_null_and_default_not_set()
    {
        var factory = new UserActionService(new List<IUserAction>() { new DummyUserAction() });

        IUserAction? userAction = factory.GetActionHandler(null);

        userAction.Should().BeNull();
    }
    
    internal class DummyUserAction : IUserAction
    {
        public string Id => "dummy";

        public Task<UserActionResult> HandleAction(UserActionContext context)
        {
            return Task.FromResult(UserActionResult.SuccessResult());
        }
    }
    
    internal class DummyUserAction2 : IUserAction
    {
        public string Id => "dummy";

        public Task<UserActionResult> HandleAction(UserActionContext context)
        {
            return Task.FromResult(UserActionResult.SuccessResult(new List<ClientAction>() { ClientAction.NextPage() }));
        }
    }
}