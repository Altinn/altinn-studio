using System;
using System.Collections.Generic;
using System.Linq;
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
    public async Task<bool> ProcessDataRead(Instance instance, Guid? dataId, object data)
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
    public async Task<bool> ProcessDataWrite(Instance instance, Guid? dataId, object data)
    {
      bool edited = false;

      if (data.GetType() == typeof(NestedGroup))
      {
        NestedGroup model = (NestedGroup)data;
        if (model?.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788?[0]?.SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131?.value == 1337)
        {
          model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788[0].SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131.value = 1338;          
          edited = true;
        }

        // Server-side computed values for prefilling values in a group
        // See https://github.com/Altinn/app-frontend-react/issues/319
        if (!string.IsNullOrEmpty(model?.PrefillValues) || model?.PrefillValues != model?.PrefillValuesShadow)
        {
          if (model.Endringsmeldinggrp9786 == null)
          {
            model.Endringsmeldinggrp9786 = new Endringsmeldinggrp9786();
          }

          model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788 = new List<OversiktOverEndringenegrp9788>();

          var prefillRows = new Dictionary<string, List<int>>();
          prefillRows["liten"] = new List<int>{1, 5};
          prefillRows["middels"] = new List<int>{120, 350};
          prefillRows["stor"] = new List<int>{1233, 3488};
          prefillRows["svaer"] = new List<int>{80323, 123455};
          prefillRows["enorm"] = new List<int>{9872345, 18872345};

          // A real app should make sure not to delete user-provided data at this point, so instead of just
          // resetting the group contents, existing data should be merged in.
          if (!string.IsNullOrEmpty(model.PrefillValues))
          {
            var valgList = model.PrefillValues?.Split(',').ToList();
            foreach (var valg in valgList)
            {
              model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788.Add(new OversiktOverEndringenegrp9788
              {
                SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131 =
                  new SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131
                  {
                    orid = 37131,
                    value = prefillRows[valg][0]
                  },
                SkattemeldingEndringEtterFristNyttBelopdatadef37132 =
                  new SkattemeldingEndringEtterFristNyttBelopdatadef37132
                  {
                    orid = 37132,
                    value = prefillRows[valg][1]
                  }
              });
            }
          }

          model.PrefillValuesShadow = model.PrefillValues;
          edited = true;
        }
      }

      if (data.GetType() == typeof(Skjema))
      {
        Skjema model = (Skjema)data;
        if (model?.NyttNavngrp9313?.NyttNavngrp9314?.PersonFornavnNyttdatadef34758?.value == "TriggerCalculation")
        {
          if (model.NyttNavngrp9313.NyttNavngrp9314.PersonMellomnavnNyttdatadef34759 == null)
          {
            model.NyttNavngrp9313.NyttNavngrp9314.PersonMellomnavnNyttdatadef34759 = new PersonMellomnavnNyttdatadef34759();
          }
          model.NyttNavngrp9313.NyttNavngrp9314.PersonMellomnavnNyttdatadef34759.value = "MiddleNameFromCalculation";
          edited = true;
        }
      }

      return await Task.FromResult(edited);
    }
  }
}
