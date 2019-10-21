using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace AltinnCore.Common.Services.Interfaces
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
