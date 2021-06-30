using System;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

using Altinn.App.Models;

namespace Altinn.App.AppLogic.DataProcessing
{
  /// <summary>
  /// Represents a business logic class responsible for running calculations on an instance.
  /// </summary>
  public class DataProcessingHandler
  {
    /// <summary>
    /// Perform data processing on data read. When reading data from App API
    /// </summary>
    /// <example>
    /// if (data.GetType() == typeof(Skjema)
    /// {
    ///     Skjema model = (Skjema)data;
    ///     // Perform calculations and manipulation of data model here
    /// }
    /// </example>
    /// <param name="instance">The instance that data belongs to</param>
    /// <param name="dataId">The dataId for data if available</param>
    /// <param name="data">The data as object</param>
    public async Task<bool> ProcessDataWrite(Instance instance, Guid? dataId, object data)
    {
      return await Task.FromResult(false);
    }

    /// <summary>
    /// Perform data processing on data write. When posting and putting data against app
    /// </summary>
    /// <example>
    /// if (data.GetType() == typeof(Skjema)
    /// {
    ///     Skjema model = (Skjema)data;
    ///     // Perform calculations and manipulation of data model here
    /// }
    /// </example>
    /// <param name="instance">The instance that data belongs to</param>
    /// <param name="dataId">The dataId for data if available</param>
    /// <param name="data">The data as object</param>
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
