using System.Threading.Tasks;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;

//// using Altinn.App.Models; // <-- Uncomment this line to refer to app model(s)

namespace App.IntegrationTests.Mocks.Apps.Ttd.PresentationTextsApp
{
    /// <summary>
    /// Represents a business logic class responsible for running calculations on an instance.
    /// </summary>
    public static class CalculationHandler
    {
        /// <summary>
        /// Perform calculations and update data model
        /// </summary>
        /// <example>
        /// if (instance.GetType() == typeof(Skjema)
        /// {
        ///     Skjema model = (Skjema)instance;
        ///     // Perform calculations and manipulation of data model here
        /// }
        /// </example>
        /// <param name="instance">The data</param>
        /// <param name="altinnAppContext">The context</param>
        public static async Task<bool> Calculate(object instance, IAltinnAppContextAccessor altinnAppContext)
        {
            AltinnAppContext appContext = altinnAppContext.GetContext();
            double result = 20.3 / appContext.PartyId;

            bool changed = false;
            if (instance.GetType() == typeof(Skjema))
            {
                Skjema model = (Skjema)instance;

                model.OpplysningerOmArbeidstakerengrp8819 = model.OpplysningerOmArbeidstakerengrp8819 ?? new OpplysningerOmArbeidstakerengrp8819();

                model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854 = model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854 ?? new Skjemainstansgrp8854();

                model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.IdentifikasjonsnummerKravdatadef33317 = new IdentifikasjonsnummerKravdatadef33317
                {
                    value = "calculatedValue"
                };

                changed = true;
            }

            return await Task.FromResult(changed);
        }
    }
}
