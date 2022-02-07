using System;
using System.Threading.Tasks;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.complex_process.AppLogic.Calculation
#pragma warning restore SA1300 // Element should begin with upper-case letter
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
            return await Task.FromResult(false);
        }
    }
}
