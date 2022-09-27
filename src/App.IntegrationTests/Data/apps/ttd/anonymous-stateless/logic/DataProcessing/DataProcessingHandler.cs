using System;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Apps.Ttd.AnonymousStateless.Models;

//// using Altinn.App.Models; // <-- Uncomment this line to refer to app model(s)

namespace App.IntegrationTests.Mocks.Apps.Ttd.AnonymousStateless
{
    /// <summary>
    /// Represents a business logic class responsible for running calculations on an instance.
    /// </summary>
    public class DataProcessingHandler: IDataProcessor
    {
        /// <summary>
        /// Perform data processing on data read. When reading data from App API
        /// </summary>
        /// <example>
        /// if (data.GetType() == typeof(Skjema)
        /// {
        ///     Skjema model = (Skjema)data;
        ///     // Perform calculations and manipulation of data model here
        /// }
        /// </example>
        /// <param name="instance">The instance that data belongs to</param>
        /// <param name="dataId">The dataId for data if available</param>
        /// <param name="data">The data as object</param>
        public async Task<bool> ProcessDataRead(Instance instance, Guid? dataId, object data)
        {
            bool changed = false;
            if (data.GetType() == typeof(Veileder))
            {
                Veileder model = (Veileder)data;
                if (model.Kommune == null)
                {
                    model.Kommune = "6863";
                    changed = true;
                }
            }

            return await Task.FromResult(changed);
        }

        /// <summary>
        /// Perform data processing on data write. When posting and putting data against app
        /// </summary>
        /// <example>
        /// if (data.GetType() == typeof(Skjema)
        /// {
        ///     Skjema model = (Skjema)data;
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
