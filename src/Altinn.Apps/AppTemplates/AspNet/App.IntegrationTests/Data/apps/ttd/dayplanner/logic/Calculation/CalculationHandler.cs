using System.Threading.Tasks;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;

//// using Altinn.App.Models; // <-- Uncomment this line to refer to app model(s)

namespace App.IntegrationTests.Mocks.Apps.Ttd.Dayplanner
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
            if (instance.GetType() == typeof(MyDay))
            {
                MyDay model = (MyDay)instance;

                model.Weather = new Weather();
                model.Weather.Temp = "20C";
            }

            return await Task.FromResult(changed);
        }
    }
}
