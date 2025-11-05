using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

using Altinn.App.Models;

namespace Altinn.App.Logic.DataProcessing
{
  /// <summary>
  /// Represents a business logic class responsible for running calculations on an instance.
  /// </summary>
  public class DataProcessor : IDataProcessor
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
    public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object previous, string language)
    {
      return Task.CompletedTask;
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
    public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string language)
    {
      if (data.GetType() != typeof(Skjema))
      {
        return Task.CompletedTask;
      }
      Skjema skjema = (Skjema)data;
      SetupModel(skjema);
      SetIdNumber(skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.IdentifikasjonsnummerKravdatadef33317);
      SetJournalNumber(skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.Journalnummerdatadef33316);
      CheckName(skjema.OpplysningerOmArbeidstakerengrp8819.OpplysningerOmArbeidstakerengrp8855.AnsattNavndatadef1223);

      return Task.CompletedTask;
    }

    private void CheckName(AnsattNavndatadef1223 name)
    {
      if (name?.value == "test")
      {
        name.value = "automation";
      }
    }

    private void SetJournalNumber(Journalnummerdatadef33316 journalNumber)
    {
      if (journalNumber?.value == 0)
      {
        journalNumber.value = 1234;
      }
    }

    private void SetIdNumber(IdentifikasjonsnummerKravdatadef33317 idField)
    {
      if (idField?.value == null)
      {
        idField.value = "1234567890";
      }
      else if (idField?.value == "1337")
      {
        idField.value = "1705";
      }
    }

    private void SetupModel(Skjema skjema)
    {
      skjema.OpplysningerOmArbeidstakerengrp8819 ??= new OpplysningerOmArbeidstakerengrp8819();
      skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854 ??= new Skjemainstansgrp8854();
      skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.Journalnummerdatadef33316 ??= new Journalnummerdatadef33316();
      skjema.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.IdentifikasjonsnummerKravdatadef33317 ??= new IdentifikasjonsnummerKravdatadef33317();
      skjema.OpplysningerOmArbeidstakerengrp8819.OpplysningerOmArbeidstakerengrp8855 ??= new OpplysningerOmArbeidstakerengrp8855();
    }
  }
}
