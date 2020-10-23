using Microsoft.AspNetCore.Http;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.task_validation
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
            if (instance.GetType() == typeof(Skjema))
            {
                Skjema model = (Skjema)instance;
                decimal? journalnummer = model.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.Journalnummerdatadef33316?.value;
                if (journalnummer != null && journalnummer == 1000)
                {
                    model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.Journalnummerdatadef33316.value = (decimal)journalnummer + 1;
                    changed = true;
                }
            }

            return changed;
        }
    }
}
