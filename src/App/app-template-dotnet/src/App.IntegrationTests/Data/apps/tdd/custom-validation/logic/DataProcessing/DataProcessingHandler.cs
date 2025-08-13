using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

//// using Altinn.App.Models; // <-- Uncomment this line to refer to app model(s)

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.custom_validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    /// <summary>
    /// Represents a business logic class responsible for running calculations on an instance.
    /// </summary>
    public class DataProcessingHandler : IDataProcessor
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
#pragma warning disable CS1998 // Async method lacks 'await' operators and will run synchronously
        public async Task<bool> ProcessDataRead(Instance instance, Guid? dataId, object data)
#pragma warning restore CS1998 // Async method lacks 'await' operators and will run synchronously
        {
            return ProcessData(data);
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
#pragma warning disable CS1998 // Async method lacks 'await' operators and will run synchronously
        public async Task<bool> ProcessDataWrite(Instance instance, Guid? dataId, object data)
#pragma warning restore CS1998 // Async method lacks 'await' operators and will run synchronously
        {
            return ProcessData(data);
        }

        public static bool ProcessData(object data)
        {
            bool changed = false;
            if (data.GetType() == typeof(Skjema))
            {
                var model = (Skjema)data;
                decimal? journalnummer = model.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.Journalnummerdatadef33316?.value;
#pragma warning disable IDE0078 // Use pattern matching
                if (journalnummer != null && journalnummer == 1000)
                {
                    model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.Journalnummerdatadef33316.value = (decimal)journalnummer + 1;
                    model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.IdentifikasjonsnummerKravdatadef33317 = new IdentifikasjonsnummerKravdatadef33317
                    {
                        orid = 33317,
                        value = "12345",
                    };
                    changed = true;
                }
                else if (journalnummer != null && journalnummer == 1001)
                {
                    model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.Journalnummerdatadef33316.value = (decimal)journalnummer - 1;
                    model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.TestRepeatinggrp123 = new List<Journalnummerdatadef33316>
                    {
                        new Journalnummerdatadef33316
                        {
                            orid = 1234,
                            value = 555,
                        },
                        new Journalnummerdatadef33316
                        {
                            orid = 1234,
                            value = 444,
                        },
                    };

                    model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.IdentifikasjonsnummerKravdatadef33317 = null;
                    changed = true;
                }
#pragma warning restore IDE0078 // Use pattern matching
            }

            return changed;
        }
    }
}