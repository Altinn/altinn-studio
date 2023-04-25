using Altinn.App.Core.Features;
using Altinn.App.Models;
using Altinn.Platform.Storage.Interface.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.App.logic.DataProcessing
{
    public class DataProcessor : IDataProcessor
    {
        public async Task<bool> ProcessDataRead(Instance instance, Guid? dataId, object data)
        {
            return await Task.FromResult(false);
        }

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
                    if (model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788 == null)
                    {
                        model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788 = new List<OversiktOverEndringenegrp9788>();
                    }

                    var prefillRows = new Dictionary<string, List<int>>();
                    prefillRows["liten"] = new List<int> { 1, 5 };
                    prefillRows["middels"] = new List<int> { 120, 350 };
                    prefillRows["stor"] = new List<int> { 1233, 3488 };
                    prefillRows["svaer"] = new List<int> { 80323, 123455 };
                    prefillRows["enorm"] = new List<int> { 9872345, 18872345 };

                    var valgList = string.IsNullOrEmpty(model.PrefillValues)
                        ? new List<string>()
                        : model.PrefillValues.Split(',').ToList();
                    var valgListPrevious = string.IsNullOrEmpty(model.PrefillValuesShadow)
                        ? new List<string>()
                        : model.PrefillValuesShadow.Split(',').ToList();

                    var newPrefills = valgList.Where(l => valgListPrevious.All(p => p != l));
                    var removedPrefills = valgListPrevious.Where(p => valgList.All(l => l != p));
                    var rowsToRemove = new List<OversiktOverEndringenegrp9788>();

                    foreach (var toRemove in removedPrefills)
                    {
                        foreach (var aRow in model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788)
                        {
                            if (aRow.isPrefill &&
                                aRow.SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131.value ==
                                prefillRows[toRemove][0] &&
                                aRow.SkattemeldingEndringEtterFristNyttBelopdatadef37132.value ==
                                prefillRows[toRemove][1])
                            {
                                rowsToRemove.Add(aRow);
                            }
                        }
                    }

                    foreach (var rowToRemove in rowsToRemove)
                    {
                        model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788.Remove(rowToRemove);
                    }

                    foreach (var toAdd in newPrefills)
                    {
                        model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788.Add(new OversiktOverEndringenegrp9788
                        {
                            SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131 =
                            new SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131
                            {
                                orid = 37131,
                                value = prefillRows[toAdd][0]
                            },
                            SkattemeldingEndringEtterFristNyttBelopdatadef37132 =
                            new SkattemeldingEndringEtterFristNyttBelopdatadef37132
                            {
                                orid = 37132,
                                value = prefillRows[toAdd][1]
                            },
                            isPrefill = true
                        });
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

                if (model != null)
                {
                    edited = true;
                    model.GridData ??= new GridData();
                    model.GridData.TotalGjeld ??= 0;
                    model.GridData.Bolig ??= new GjeldsFordeling();
                    model.GridData.Kredittkort ??= new GjeldsFordeling();
                    model.GridData.Studie ??= new GjeldsFordeling();
                    model.GridData.Bolig.Prosent ??= 0;
                    model.GridData.Kredittkort.Prosent ??= 0;
                    model.GridData.Studie.Prosent ??= 0;
                    model.GridData.Bolig.Belop ??= 0;
                    model.GridData.Kredittkort.Belop ??= 0;
                    model.GridData.Studie.Belop ??= 0;
                    model.GridData.TotalProsent = model.GridData.Bolig.Prosent + model.GridData.Kredittkort.Prosent +
                                                  model.GridData.Studie.Prosent;
                    model.GridData.Bolig.Belop = model.GridData.TotalGjeld * model.GridData.Bolig.Prosent / 100;
                    model.GridData.Studie.Belop = model.GridData.TotalGjeld * model.GridData.Studie.Prosent / 100;
                    model.GridData.Kredittkort.Belop = model.GridData.TotalGjeld * model.GridData.Kredittkort.Prosent / 100;
                }
            }

            return await Task.FromResult(edited);
        }
    }
}
