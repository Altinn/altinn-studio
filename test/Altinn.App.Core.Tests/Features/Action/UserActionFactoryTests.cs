using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Models.UserAction;
using FluentAssertions;
using Xunit;

namespace Altinn.App.Core.Tests.Features.Action;

public class UserActionFactoryTests
{
    [Fact]
    public void GetActionHandler_should_return_DummyActionHandler_for_id_dummy()
    {
        var factory = new UserActionFactory(new List<IUserAction>() { new DummyUserAction() });

        IUserAction userAction = factory.GetActionHandler("dummy");

        userAction.Should().BeOfType<DummyUserAction>();
        userAction.Id.Should().Be("dummy");
    }
    
    [Fact]
    public void GetActionHandler_should_return_first_DummyActionHandler_for_id_dummy_if_multiple()
    {
        var factory = new UserActionFactory(new List<IUserAction>() { new DummyUserAction(), new DummyUserAction2() });

        IUserAction userAction = factory.GetActionHandler("dummy");

        userAction.Should().BeOfType<DummyUserAction>();
        userAction.Id.Should().Be("dummy");
    }
    
    [Fact]
    public void GetActionHandler_should_return_NullActionHandler_if_id_not_found()
    {
        var factory = new UserActionFactory(new List<IUserAction>() { new DummyUserAction() });

        IUserAction userAction = factory.GetActionHandler("nonexisting");

        userAction.Should().BeOfType<NullUserAction>();
        userAction.Id.Should().Be("null");
    }
    
    [Fact]
    public void GetActionHandler_should_return_NullActionHandler_if_id_is_null()
    {
        var factory = new UserActionFactory(new List<IUserAction>() { new DummyUserAction() });

        IUserAction userAction = factory.GetActionHandler(null);

        userAction.Should().BeOfType<NullUserAction>();
        userAction.Id.Should().Be("null");
    }
    
    internal class DummyUserAction : IUserAction
    {
        public string Id { get; set; } = "dummy";

        public Task<bool> HandleAction(UserActionContext context)
        {
            return Task.FromResult(true);
        }
    }
    
    internal class DummyUserAction2 : IUserAction
    {
        public string Id { get; set; } = "dummy";

        public Task<bool> HandleAction(UserActionContext context)
        {
            return Task.FromResult(true);
        }
    }
}