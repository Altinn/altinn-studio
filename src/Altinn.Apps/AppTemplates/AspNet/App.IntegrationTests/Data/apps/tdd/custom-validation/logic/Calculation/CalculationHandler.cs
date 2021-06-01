using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.custom_validation
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
            }

            return changed;
        }
    }
}
