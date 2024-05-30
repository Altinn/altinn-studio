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
}
