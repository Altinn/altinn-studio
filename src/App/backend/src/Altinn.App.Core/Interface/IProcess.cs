using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Interface;

/// <summary>
/// Process service that encapsulate reading of the BPMN process definition.
/// </summary>
[Obsolete(message: "Use Altinn.App.Core.Internal.Process.IProcessClient instead", error: true)]
public interface IProcess
{
    /// <summary>
    /// Returns a stream that contains the process definition.
    /// </summary>
    /// <returns>the stream</returns>
    Stream GetProcessDefinition();

    /// <summary>
    /// Gets the instance process events related to the instance matching the instance id.
    /// </summary>
    Task<ProcessHistoryList> GetProcessHistory(string instanceGuid, string instanceOwnerPartyId);
}
