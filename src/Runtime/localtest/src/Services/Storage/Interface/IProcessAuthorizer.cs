using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Authorization;

/// <summary>
/// Authorizer for process operations. To keep app policies simple, a service owner token skips policy
/// evaluation: the workflow engine uses it to commit the app's process transitions. Today any token for
/// the org that owns the app qualifies, not only the one the app itself uses. Every other caller is
/// checked as each method describes.
/// </summary>
public interface IProcessAuthorizer
{
    /// <summary>
    /// Determines if the user is authorized to perform process next for the current task.
    /// Checks authorization against the set of actions that allow process next for the current task type.
    /// </summary>
    /// <param name="instance">The instance to authorize against.</param>
    /// <param name="nextProcessState">The incoming process state, used to handle flow type overrides (e.g. AbandonCurrentMoveToNext).</param>
    Task<bool> AuthorizeProcessNext(Instance instance, ProcessState nextProcessState);

    /// <summary>
    /// Determines if the user is authorized to lock an instance.
    /// Checks the task-type actions plus "reject", since the flow type is not known at lock time.
    /// </summary>
    Task<bool> AuthorizeInstanceLock(Instance instance);

    /// <summary>
    /// Determines if the user is authorized to lock a data element.
    /// Checks the task-type actions plus "reject", since the flow type is not known at lock time.
    /// </summary>
    Task<bool> AuthorizeDataElementLock(Instance instance);

    /// <summary>
    /// Determines if the user is authorized to update presentation texts.
    /// Checks the task-type actions plus "reject", since the flow type is not known at update time.
    /// </summary>
    Task<bool> AuthorizePresentationTextsUpdate(Instance instance);

    /// <summary>
    /// Determines if the user is authorized to update data values.
    /// Checks the task-type actions plus "reject", since the flow type is not known at update time.
    /// Has a bypass for the sync adapter scope.
    /// </summary>
    Task<bool> AuthorizeDataValuesUpdate(Instance instance);
}
