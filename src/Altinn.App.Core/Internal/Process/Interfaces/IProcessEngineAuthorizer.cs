using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Authorizer for the process engine.
/// </summary>
public interface IProcessEngineAuthorizer
{
    /// <summary>
    /// Use this to determine if the user is allowed to perform process next for the current task.
    /// </summary>
    Task<bool> AuthorizeProcessNext(Instance instance, string? action = null);
}
