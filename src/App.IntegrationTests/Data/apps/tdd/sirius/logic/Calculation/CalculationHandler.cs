using System.Threading.Tasks;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.sirius.AppLogic.Calculation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class CalculationHandler
    {
        public CalculationHandler()
        {
        }

        public async Task<bool> Calculate(object instance)
        {
            return await Task.FromResult(false);
        }
    }
}
