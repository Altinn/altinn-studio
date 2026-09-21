using System;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

using Altinn.App.Models;

namespace Altinn.App.logic
{
  public class DataProcessor: IDataProcessor
  {
    public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object? previous, string? language)
    {
      return Task.CompletedTask;
    }

    public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string? language)
    {
      if (data.GetType() != typeof(Skjema))
      {
        return Task.CompletedTask;
      }

      Skjema skjema = (Skjema)data;

      // `skjema` is a cast of the non-null `data` argument, so it is dereferenced directly below.
      // The `?.` chains guard the nested model groups, which really can be absent.
      if (skjema.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.IdentifikasjonsnummerKravdatadef33317?.value == null)
      {
        var arbeidstakere = skjema.OpplysningerOmArbeidstakerengrp8819 ??= new OpplysningerOmArbeidstakerengrp8819();
        arbeidstakere.Skjemainstansgrp8854 ??= new Skjemainstansgrp8854()
        {
          IdentifikasjonsnummerKravdatadef33317 = new IdentifikasjonsnummerKravdatadef33317()
          {
            value = "1234567890"
          }
        };

      }
      if (skjema.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.IdentifikasjonsnummerKravdatadef33317?.value == "1337")
      {
        skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.IdentifikasjonsnummerKravdatadef33317.value = "1705";
      }
      if (skjema.OpplysningerOmArbeidstakerengrp8819?.OpplysningerOmArbeidstakerengrp8855?.AnsattNavndatadef1223?.value == "test")
      {
        skjema.OpplysningerOmArbeidstakerengrp8819.OpplysningerOmArbeidstakerengrp8855.AnsattNavndatadef1223.value = "automation";
      }
      if (skjema.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.Journalnummerdatadef33316?.value == null)
      {
        var arbeidstakere = skjema.OpplysningerOmArbeidstakerengrp8819 ??= new OpplysningerOmArbeidstakerengrp8819();
        var skjemainstans = arbeidstakere.Skjemainstansgrp8854 ??= new Skjemainstansgrp8854();
        var journalnummer = skjemainstans.Journalnummerdatadef33316 ??= new Journalnummerdatadef33316();
        journalnummer.value = 1364;
      }
      return Task.CompletedTask;
    }
  }
}
