using System;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

using Altinn.App.Models; // <-- Uncomment this line to refer to app model(s)

namespace Altinn.App.AppLogic.DataProcessing
{
    /// <summary>
    /// Represents a business logic class responsible for running calculations on an instance.
    /// </summary>
    public class DataProcessingHandler
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
            return await Task.FromResult(false);
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
             if (data.GetType() == typeof(NestedGroup))
            {
                NestedGroup model = (NestedGroup) data;
                if (model?.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788?[0]?.SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131?.value == 1337)
                {
                    model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788[0].SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131.value = 1339;
                    return true;
                }
            }
            return await Task.FromResult(true);
        }
    }
}
