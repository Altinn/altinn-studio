using System.Threading.Tasks;
using Altinn.App.Models; // <-- Uncomment this line to refer to app model(s)

namespace Altinn.App.AppLogic.Calculation
{
  /// <summary>
  /// Represents a business logic class responsible for running calculations on an instance.
  /// </summary>
  public class CalculationHandler
  {
    public async Task<bool> Calculate(object instance)
    {
      if (instance.GetType() != typeof(Skjema))
      {
        return false;
      }

      Skjema skjema = (Skjema)instance;

      if (skjema?.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.IdentifikasjonsnummerKravdatadef33317?.value == null)
      {
        skjema.OpplysningerOmArbeidstakerengrp8819 = skjema.OpplysningerOmArbeidstakerengrp8819 ?? new OpplysningerOmArbeidstakerengrp8819();
        skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854 = new Skjemainstansgrp8854()
        {
          IdentifikasjonsnummerKravdatadef33317 = new IdentifikasjonsnummerKravdatadef33317()
          {
            value = "1234567890"
          }
        };

      }
      else if (skjema?.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.IdentifikasjonsnummerKravdatadef33317?.value == "1337")
      {
        skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.IdentifikasjonsnummerKravdatadef33317.value = "1705";
      }
      if (skjema?.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.Journalnummerdatadef33316?.value == null)
      {
        skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854 = new Skjemainstansgrp8854()
        {
          Journalnummerdatadef33316 = new Journalnummerdatadef33316()
          {
            value = 1364
          }
        };
      }
      return await Task.FromResult(true);
    }

  }
}
