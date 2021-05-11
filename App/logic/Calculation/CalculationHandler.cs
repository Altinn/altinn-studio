using System.Threading.Tasks;
using Altinn.App.Models;
namespace Altinn.App.AppLogic.Calculation
{
    public class CalculationHandler
    {
        public CalculationHandler()
        {
        }

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
        public async Task<bool> Calculate(object instance)
        {
            if (instance.GetType() == typeof(NestedGroup))
            {
                NestedGroup model = (NestedGroup) instance;
                if (model?.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788?[0]?.SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131?.value == 1337)
                {
                    model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788[0].SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131.value = 1338;
                    return true;
                }
            }
            return await Task.FromResult(false);
        }
    }
}
