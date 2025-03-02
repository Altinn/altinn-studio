#nullable disable
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Authorization;
using Altinn.App.Core.Tests.Internal.Process.Action.TestData;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Internal.Process.Action;

public class UserActionAuthorizerServiceCollectionExtensionTests
{
    [Fact]
    public void AddTransientUserActionAuthorizerForActionInTask_adds_IUserActinAuthorizerProvider_with_task_and_action_set()
    {
        // Arrange
        string taskId = "Task_1";
        string action = "Action_1";
        IServiceCollection services = new ServiceCollection();
        services.AddAppImplementationFactory();

        // Act
        services.IsAdded(typeof(IUserActionAuthorizerProvider)).Should().BeFalse();
        services.AddTransientUserActionAuthorizerForActionInTask<UserActionAuthorizerStub>(taskId, action);

        // Assert
        services.IsAdded(typeof(IUserActionAuthorizerProvider)).Should().BeTrue();
        services.IsAdded(typeof(UserActionAuthorizerStub)).Should().BeTrue();
        var sp = services.BuildStrictServiceProvider();
        var provider = sp.GetService<IUserActionAuthorizerProvider>();
        provider.Should().NotBeNull();
        provider.TaskId.Should().Be(taskId);
        provider.Action.Should().Be(action);
        provider.Authorizer.Should().BeOfType<UserActionAuthorizerStub>();
    }

    [Fact]
    public void AddTransientUserActionAuthorizerForActionInTask_adds_only_one_UserActionAuthorizerStub_if_used_multiple_times()
    {
        // Arrange
        string taskId = "Task_1";
        string action = "Action_1";
        string taskId2 = "Task_2";
        IServiceCollection services = new ServiceCollection();
        services.AddAppImplementationFactory();

        // Act
        services.IsAdded(typeof(IUserActionAuthorizerProvider)).Should().BeFalse();
        services.AddUserActionAuthorizerForActionInTask<UserActionAuthorizerStub>(
            taskId,
            action,
            ServiceLifetime.Singleton
        );
        services.AddUserActionAuthorizerForActionInTask<UserActionAuthorizerStub>(
            taskId2,
            action,
            ServiceLifetime.Singleton
        );

        // Assert
        services.IsAdded(typeof(IUserActionAuthorizerProvider)).Should().BeTrue();
        services.IsAdded(typeof(UserActionAuthorizerStub)).Should().BeTrue();
        using var sp = services.BuildStrictServiceProvider();
        var authorizer = sp.GetServices<UserActionAuthorizerStub>();
        authorizer.Should().NotBeNull();
        authorizer.Should().HaveCount(1);
        var provider = sp.GetServices<IUserActionAuthorizerProvider>();
        provider.Should().NotBeNull();
        provider.Should().HaveCount(2);
        provider
            .Should()
            .ContainSingle(p => p.TaskId == taskId && p.Action == action && p.Authorizer == authorizer.First());
        provider
            .Should()
            .ContainSingle(p => p.TaskId == taskId2 && p.Action == action && p.Authorizer == authorizer.First());
    }

    [Fact]
    public void AddTransientUserActionAuthorizerForActionInAllTasks_adds_IUserActinAuthorizerProvider_with_action_set()
    {
        // Arrange
        string action = "Action_1";
        IServiceCollection services = new ServiceCollection();
        services.AddAppImplementationFactory();

        // Act
        services.IsAdded(typeof(IUserActionAuthorizerProvider)).Should().BeFalse();
        services.AddTransientUserActionAuthorizerForActionInAllTasks<UserActionAuthorizerStub>(action);

        // Assert
        services.IsAdded(typeof(IUserActionAuthorizerProvider)).Should().BeTrue();
        services.IsAdded(typeof(UserActionAuthorizerStub)).Should().BeTrue();
        var sp = services.BuildStrictServiceProvider();
        var provider = sp.GetService<IUserActionAuthorizerProvider>();
        provider.Should().NotBeNull();
        provider.TaskId.Should().BeNull();
        provider.Action.Should().Be(action);
        provider.Authorizer.Should().BeOfType<UserActionAuthorizerStub>();
    }

    [Fact]
    public void AddTransientUserActionAuthorizerForAllActionsInTask_adds_IUserActinAuthorizerProvider_with_task_set()
    {
        // Arrange
        string taskId = "Task_1";
        IServiceCollection services = new ServiceCollection();
        services.AddAppImplementationFactory();

        // Act
        services.IsAdded(typeof(IUserActionAuthorizerProvider)).Should().BeFalse();
        services.AddTransientUserActionAuthorizerForAllActionsInTask<UserActionAuthorizerStub>(taskId);

        // Assert
        services.IsAdded(typeof(IUserActionAuthorizerProvider)).Should().BeTrue();
        services.IsAdded(typeof(UserActionAuthorizerStub)).Should().BeTrue();
        var sp = services.BuildStrictServiceProvider();
        var provider = sp.GetService<IUserActionAuthorizerProvider>();
        provider.Should().NotBeNull();
        provider.TaskId.Should().Be(taskId);
        provider.Action.Should().BeNull();
        provider.Authorizer.Should().BeOfType<UserActionAuthorizerStub>();
    }

    [Fact]
    public void AddTransientUserActionAuthorizerForAllActionsInAllTasks_adds_IUserActinAuthorizerProvider_without_task_and_action_set()
    {
        // Arrange
        IServiceCollection services = new ServiceCollection();
        services.AddAppImplementationFactory();

        // Act
        services.IsAdded(typeof(IUserActionAuthorizerProvider)).Should().BeFalse();
        services.AddTransientUserActionAuthorizerForAllActionsInAllTasks<UserActionAuthorizerStub>();

        // Assert
        services.IsAdded(typeof(IUserActionAuthorizerProvider)).Should().BeTrue();
        services.IsAdded(typeof(UserActionAuthorizerStub)).Should().BeTrue();
        var sp = services.BuildStrictServiceProvider();
        var provider = sp.GetService<IUserActionAuthorizerProvider>();
        provider.Should().NotBeNull();
        provider.TaskId.Should().BeNull();
        provider.Action.Should().BeNull();
        provider.Authorizer.Should().BeOfType<UserActionAuthorizerStub>();
    }
}
