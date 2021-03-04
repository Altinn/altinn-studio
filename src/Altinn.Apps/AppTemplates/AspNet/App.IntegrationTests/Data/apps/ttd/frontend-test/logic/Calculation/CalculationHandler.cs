using System.Threading.Tasks;
//using Altinn.App.Models; // <-- Uncomment this line to refer to app model(s)

namespace App.IntegrationTests.Mocks.Apps.tdd.frontendtest
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
