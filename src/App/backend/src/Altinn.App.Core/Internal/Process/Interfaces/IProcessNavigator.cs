using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Interface used to descipt the process navigator
/// </summary>
public interface IProcessNavigator
{
    /// <summary>
    /// Get the next task in the process from the current element based on the action and datadriven gateway decisions
    /// </summary>
    /// <param name="instance">Instance data</param>
    /// <param name="currentElement">Current process element id</param>
    /// <param name="action">Action performed</param>
    /// <returns>The next process task</returns>
    public Task<ProcessElement?> GetNextTask(Instance instance, string currentElement, string? action);

    /// <summary>
    /// Same as <see cref="GetNextTask(Instance, string, string?)"/>, but lets the caller pick the Storage
    /// authentication used when evaluating data-driven gateway conditions. System-initiated transitions
    /// (e.g. asynchronous service-task replies) run without a user context and must pass
    /// <see cref="StorageAuthenticationMethod.ServiceOwner()"/>; user-driven transitions pass null to keep
    /// the default (current user) authentication. The default implementation ignores
    /// <paramref name="authenticationMethod"/> for backwards compatibility with custom implementations.
    /// </summary>
    /// <param name="instance">Instance data</param>
    /// <param name="currentElement">Current process element id</param>
    /// <param name="action">Action performed</param>
    /// <param name="authenticationMethod">Storage authentication for data-driven gateway evaluation, or null for the current user</param>
    /// <returns>The next process task</returns>
    public Task<ProcessElement?> GetNextTask(
        Instance instance,
        string currentElement,
        string? action,
        StorageAuthenticationMethod? authenticationMethod
    ) => GetNextTask(instance, currentElement, action);
}
