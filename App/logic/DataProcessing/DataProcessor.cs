using System;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

using Altinn.App.Models;

namespace Altinn.App.AppLogic.DataProcessing
{
  public class DataProcessor: IDataProcessor
  {
    public async Task<bool> ProcessDataWrite(Instance instance, Guid? dataId, object data)
    {
      return await Task.FromResult(false);
    }

    public async Task<bool> ProcessDataRead(Instance instance, Guid? dataId, object data)
    {
      if (data.GetType() != typeof(Skjema))
      {
        return false;
      }
      Skjema skjema = (Skjema)data;

      if (skjema?.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.IdentifikasjonsnummerKravdatadef33317?.value == null)
      {
        skjema.OpplysningerOmArbeidstakerengrp8819 ??= new OpplysningerOmArbeidstakerengrp8819();
        skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854 ??= new Skjemainstansgrp8854()
        {
          IdentifikasjonsnummerKravdatadef33317 = new IdentifikasjonsnummerKravdatadef33317()
          {
            value = "1234567890"
          }
        };

      }
      if (skjema?.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.IdentifikasjonsnummerKravdatadef33317?.value == "1337")
      {
        skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.IdentifikasjonsnummerKravdatadef33317.value = "1705";
      }
      if (skjema?.OpplysningerOmArbeidstakerengrp8819?.OpplysningerOmArbeidstakerengrp8855?.AnsattNavndatadef1223?.value == "test")
      {
        skjema.OpplysningerOmArbeidstakerengrp8819.OpplysningerOmArbeidstakerengrp8855.AnsattNavndatadef1223.value = "automation";
      }
      if (skjema?.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.Journalnummerdatadef33316?.value == null)
      {
        skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854 ??= new Skjemainstansgrp8854();
        skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.Journalnummerdatadef33316 ??= new Journalnummerdatadef33316();
        skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.Journalnummerdatadef33316.value = 1364;
      }
      return await Task.FromResult(true);
    }
  }
}
