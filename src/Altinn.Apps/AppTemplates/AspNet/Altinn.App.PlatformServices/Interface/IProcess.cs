using System.IO;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Process service that encapsulate reading of the BPMN process definition.
    /// </summary>
    public interface IProcess
    {
        /// <summary>
        /// Returns a stream that contains the process definition.
        /// </summary>        
        /// <returns>the stream</returns>
        Stream GetProcessDefinition(string org, string app);
    }
}
