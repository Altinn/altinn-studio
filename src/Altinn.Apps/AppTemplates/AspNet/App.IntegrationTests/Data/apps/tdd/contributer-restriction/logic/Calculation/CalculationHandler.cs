using Microsoft.AspNetCore.Http;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.contributer_restriction
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class CalculationHandler
    {
        private IHttpContextAccessor _httpContextAccessor;

        public CalculationHandler(IHttpContextAccessor httpContextAccessor = null)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public bool Calculate(object instance)
        {
            bool changed = false;
            return changed;
        }
    }
}
