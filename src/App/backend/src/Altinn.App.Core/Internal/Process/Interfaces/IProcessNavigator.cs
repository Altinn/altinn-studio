using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements.Base;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Interface used to describe the process navigator
/// </summary>
public interface IProcessNavigator
{
    /// <summary>
    /// Get the next task in the process from the current element based on the action and datadriven gateway decisions
    /// </summary>
    /// <param name="dataAccessor">Instance data, used for the gateway decisions</param>
    /// <param name="currentElement">Current process element id</param>
    /// <param name="action">Action performed</param>
    /// <returns>The next process task</returns>
    public Task<ProcessElement?> GetNextTask(IInstanceDataAccessor dataAccessor, string currentElement, string? action);
}
