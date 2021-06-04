using System;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

//// using Altinn.App.Models; // <-- Uncomment this line to refer to app model(s)

namespace Altinn.App.AppLogic.DataProcessing
{
    /// <summary>
    /// Represents a business logic class responsible for running calculations on an instance.
    /// </summary>
    public class DataProcessingHandler
    {
        /// <summary>
        /// Perform data processing on data write. When posting and putting data against app
        /// </summary>
        /// <example>
        /// if (instance.GetType() == typeof(Skjema)
        /// {
        ///     Skjema model = (Skjema)instance;
        ///     // Perform calculations and manipulation of data model here
        /// }
        /// </example>
        /// <param name="instance">The instance that data belongs to</param>
        /// <param name="dataId">The dataId for data if available</param>
        /// <param name="data">The data as object</param>
        public async Task<bool> ProcessDataRead(Instance instance, Guid? dataId, object data)
        {
            return await Task.FromResult(false);
        }

        /// <summary>
        /// Perform data processing on data write. When posting and putting data against app
        /// </summary>
        /// <example>
        /// if (instance.GetType() == typeof(Skjema)
        /// {
        ///     Skjema model = (Skjema)instance;
        ///     // Perform calculations and manipulation of data model here
        /// }
        /// </example>
        /// <param name="instance">The instance that data belongs to</param>
        /// <param name="dataId">The dataId for data if available</param>
        /// <param name="data">The data as object</param>
        public async Task<bool> ProcessDataWrite(Instance instance, Guid? dataId, object data)
        {
            return await Task.FromResult(false);
        }
    }
}
