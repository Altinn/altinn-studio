using Altinn.App.Core.Features;
using Altinn.App.Models;
using Altinn.Platform.Storage.Interface.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Components.Forms;
using Newtonsoft.Json;

namespace Altinn.App.logic.DataProcessing
{
    public class DataProcessor : IDataProcessor
    {
        public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string? language)
        {
            return Task.CompletedTask;
        }

        public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object? previous, string? language)
        {
 
            if (data.GetType() == typeof(NestedGroup))
            {
                NestedGroup model = (NestedGroup)data;
                if (model.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788 != null &&
                    model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788?.Count > 0 &&
                    model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788[0]?.SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131?.value == 1337)
                {
                    model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788[0].SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131.value = 1338;
                }

                // Server-side computed values for prefilling values in a group
                // See https://github.com/Altinn/app-frontend-react/issues/319
                if (!string.IsNullOrEmpty(model.PrefillValues) || model.PrefillValues != model.PrefillValuesShadow)
                {
                    model.Endringsmeldinggrp9786 ??= new Endringsmeldinggrp9786();
                    model.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788 ??= new List<OversiktOverEndringenegrp9788>();

                    var prefillRows = new Dictionary<string, List<int>>
                    {
                        ["liten"] = new() { 1, 5 },
                        ["middels"] = new() { 120, 350 },
                        ["stor"] = new() { 1233, 3488 },
                        ["svaer"] = new() { 80323, 123455 },
                        ["enorm"] = new() { 9872345, 18872345 }
                    };

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
                                aRow.SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131?.value ==
                                prefillRows[toRemove][0] &&
                                aRow.SkattemeldingEndringEtterFristNyttBelopdatadef37132?.value ==
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
                }

                // Calculating the sum of all changes, and selected changes (above hideRowValue)
                decimal newSumAll = 0;
                decimal newSumAboveLimit = 0;
                int newNumAboveLimit = 0;
                if (model.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788 != null)
                    foreach (var row in model.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788)
                    {
                        var from = row?.SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131?.value ?? 0;
                        var to = row?.SkattemeldingEndringEtterFristNyttBelopdatadef37132?.value ?? 0;
                        var change = to - from;
                        newSumAll += change;
                        if (from >= model.hideRowValue)
                        {
                            newSumAboveLimit += change;
                            newNumAboveLimit++;
                        }
                    }

                if (newNumAboveLimit > 0)
                {
                    // We _only_ want to update these numbers if there are rows above the limit. This is because
                    // we have multiple bugs in app-frontend that causes weird things to happen if the server sends
                    // back new data while we're editing in the group. For now, we simply avoid setting these values
                    // unless the page with these numbers displayed is visible. In the future, tests should pass even
                    // if we remove the if above here.
                    if (newSumAll != model.sumAll || newSumAboveLimit != model.sumAboveLimit || newNumAboveLimit != model.numAboveLimit)
                    {
                        model.sumAll = newSumAll;
                        model.sumAboveLimit = newSumAboveLimit;
                        model.numAboveLimit = newNumAboveLimit;
                    }
                }

                // Look at Group2, and increment the counter when encountering a new row without a row number
                if (model.Endringsmeldinggrp9786 != null && model.Endringsmeldinggrp9786.Gruppe2 != null)
                {
                    foreach (var row in model.Endringsmeldinggrp9786.Gruppe2.Where(row => row.Teller is null or 0))
                    {
                        model.Group2Teller++;
                        row.Teller = model.Group2Teller;
                    }
                }

                if (model.Pets != null)
                {
                    foreach (var row in model.Pets)
                    {
                        if (row.UniqueId == null)
                        {
                            // Generate a new unique id for each row. This is used when referencing the row from
                            // the checkbox group below the group, and is not deleted when the instance ends (as opposed
                            // to the internal row id).
                            row.UniqueId = Guid.NewGuid().ToString();
                        }

                        // This makes sure the panel is not shown even when all pets are deleted
                        model.ForceShowPets = true;
                    }
                }
                model.NumPets = model.Pets?.Count ?? 0;
            }

            if (data.GetType() == typeof(Skjema))
            {
                Skjema model = (Skjema)data;

                if (model.ColorsLabels == null)
                {
                    model.ColorsLabelsVerify = null;
                }
                
                if (model.ColorsLabels?.Count  > 0)
                {
                    /*
                     This converts saved labels from checkboxes from string[] to string
                     The reason we do this is to be able to verify that the correct labels have
                     been saved when we run cypress tests.
                     */
                    var json = JsonConvert.SerializeObject(model, Formatting.Indented);
                    var stringToSave = string.Join(",", model.ColorsLabels);
                    model.ColorsLabelsVerify = stringToSave;
                }
                
                if (model?.NyttNavngrp9313?.NyttNavngrp9314?.PersonFornavnNyttdatadef34758?.value == "TriggerCalculation")
                {
                    model.NyttNavngrp9313.NyttNavngrp9314.PersonMellomnavnNyttdatadef34759 ??= new PersonMellomnavnNyttdatadef34759();
                    model.NyttNavngrp9313.NyttNavngrp9314.PersonMellomnavnNyttdatadef34759.value = "MiddleNameFromCalculation";
                }

                if (model != null)
                {
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

                if (model?.MapData != null) {
                  model.MapData.Geometries ??= new List<Geometry>();
                  GeometryData.UpdateGeometryData(model.MapData.Geometries, model.MapData.Selected);
                }

                // Concatenating nested group comment labels into a single string
                if (model?.ConflictingOptions?.Animals != null)
                {
                    foreach (var animal in model.ConflictingOptions.Animals)
                    {
                        animal.CommentLabels = string.Join(", ",
                            animal.Comments.Select(c => c.TypeLabel).Distinct().Where(l => !string.IsNullOrEmpty(l)));

                        // This just copies the colors into a list. The use-case for this is to test a bug that caused
                        // a backend mutation like this to confuse the frontend and we'd end up with infinite repeating
                        // PATCH requests.
                        var sepColors = animal.Color.Split(',').Select(c => c.Trim())
                            .Where(c => !string.IsNullOrEmpty(c)).ToList();

                        // To protect frontend versions that don't have this fix yet, only
                        // do it when GREEN has been selected
                        if (sepColors.Contains("GREEN"))
                        {
                            animal.Colors = new List<string>();
                            animal.Colors.AddRange(sepColors);
                        }
                    }
                }
                
                if (model?.FilteredOptions?.Ingredients != null)
                {
                    var usedTypes = new HashSet<decimal?>();
                    model.FilteredOptions.UsedTypes = "";
                    foreach (var ingredient in model.FilteredOptions.Ingredients)
                    {
                        usedTypes.Add(ingredient.Type);
                    }
                    usedTypes.Remove(null);
                    model.FilteredOptions.UsedTypes = string.Join(",", usedTypes);
                }
            }

            return Task.CompletedTask;
        }
    }
}
