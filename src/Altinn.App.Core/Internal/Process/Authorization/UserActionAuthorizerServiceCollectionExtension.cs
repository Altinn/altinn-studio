using Altinn.App.Core.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.App.Core.Internal.Process.Authorization;

/// <summary>
/// Extension methods for adding user action authorizers to the service collection connected to a action and/or task
/// </summary>
public static class UserActionAuthorizerServiceCollectionExtension
{
    /// <summary>
    /// Adds a transient user action authorizer to the service collection connected to a action and task
    /// </summary>
    /// <param name="services">ServiceCollection</param>
    /// <param name="taskId">Id of the task the authorizer should run for</param>
    /// <param name="action">Name of the action the authorizer should run for</param>
    /// <typeparam name="T">Implementation if <see cref="IUserActionAuthorizer"/> that should be executed</typeparam>
    /// <returns></returns>
    public static IServiceCollection AddTransientUserActionAuthorizerForActionInTask<T>(
        this IServiceCollection services,
        string taskId,
        string action
    )
        where T : class, IUserActionAuthorizer
    {
        return services.RegisterUserActionAuthorizer<T>(taskId, action);
    }

    internal static IServiceCollection AddUserActionAuthorizerForActionInTask<T>(
        this IServiceCollection services,
        string taskId,
        string action,
        ServiceLifetime lifetime
    )
        where T : class, IUserActionAuthorizer
    {
        return services.RegisterUserActionAuthorizer<T>(taskId, action, lifetime);
    }

    /// <summary>
    /// Adds a transient user action authorizer to the service collection connected to a action in all tasks
    /// </summary>
    /// <param name="services">ServiceCollection</param>
    /// <param name="action">Name of the action the authorizer should run for</param>
    /// <typeparam name="T">Implementation if <see cref="IUserActionAuthorizer"/> that should be executed</typeparam>
    /// <returns></returns>
    public static IServiceCollection AddTransientUserActionAuthorizerForActionInAllTasks<T>(
        this IServiceCollection services,
        string action
    )
        where T : class, IUserActionAuthorizer
    {
        return services.RegisterUserActionAuthorizer<T>(null, action);
    }

    /// <summary>
    /// Adds a transient user action authorizer to the service collection connected to all actions in a task
    /// </summary>
    /// <param name="services">ServiceCollection</param>
    /// <param name="taskId">Name of the action the authorizer should run for</param>
    /// <typeparam name="T">Implementation if <see cref="IUserActionAuthorizer"/> that should be executed</typeparam>
    /// <returns></returns>
    public static IServiceCollection AddTransientUserActionAuthorizerForAllActionsInTask<T>(
        this IServiceCollection services,
        string taskId
    )
        where T : class, IUserActionAuthorizer
    {
        return services.RegisterUserActionAuthorizer<T>(taskId, null);
    }

    /// <summary>
    /// Adds a transient user action authorizer to the service collection connected to all actions in all tasks
    /// </summary>
    /// <param name="services">ServiceCollection</param>
    /// <typeparam name="T">Implementation if <see cref="IUserActionAuthorizer"/> that should be executed</typeparam>
    /// <returns></returns>
    public static IServiceCollection AddTransientUserActionAuthorizerForAllActionsInAllTasks<T>(
        this IServiceCollection services
    )
        where T : class, IUserActionAuthorizer
    {
        return services.RegisterUserActionAuthorizer<T>(null, null);
    }

    private static IServiceCollection RegisterUserActionAuthorizer<T>(
        this IServiceCollection services,
        string? taskId,
        string? action,
        ServiceLifetime lifetime = ServiceLifetime.Transient
    )
        where T : class, IUserActionAuthorizer
    {
        services.TryAdd(new ServiceDescriptor(typeof(T), typeof(T), lifetime));
        services.AddTransient<IUserActionAuthorizerProvider>(sp => new UserActionAuthorizerProvider(
            taskId,
            action,
            // TODO: analyzer when there is a generic T?
            () => sp.GetRequiredService<AppImplementationFactory>().GetRequired<T>()
        ));
        return services;
    }
}
