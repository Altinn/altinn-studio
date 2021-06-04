using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Apps.Ttd.Dayplanner;

//// using Altinn.App.Models; // <-- Uncomment this line to refer to app model(s)

namespace App.IntegrationTests.Mocks.Apps.Ttd.Dayplanner
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
        public async Task<bool> ProcessDataRead(Instance instance, string dataId, object data)
        {
            bool changed = false;
            if (data.GetType() == typeof(MyDay))
            {
                MyDay model = (MyDay)data;

                model.Weather = new Weather();
                model.Weather.Temp = "20C";
            }

            return await Task.FromResult(changed);
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
        public async Task<bool> ProcessDataWrite(Instance instance, string dataId, object data)
        {
            return await Task.FromResult(false);
        }
    }
}
