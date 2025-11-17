using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic.Validation
{
    public class GroupValidator : IFormDataValidator
    {
        public string DataType { get; } = "nested-group";

        public bool HasRelevantChanges(object current, object previous)
        {
            return true;
        }

        public Task<List<ValidationIssue>> ValidateFormData(Instance instance, DataElement dataElement, object data, string language)
        {
            List<ValidationIssue> validationIssues = new List<ValidationIssue>();

            NestedGroup model = (NestedGroup)data;
            String comments = model?.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788
                .FirstOrDefault()?.nestedgrp1234
                .FirstOrDefault()?.SkattemeldingEndringEtterFristKommentardatadef37133?.value;
            String name = model?.Endringsmeldinggrp9786?.Avgivergrp9787?.OppgavegiverNavndatadef68?.value;
            var newValue = model?.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788?
                .FirstOrDefault()?.SkattemeldingEndringEtterFristNyttBelopdatadef37132?.value;

            if (!string.IsNullOrEmpty(name) && name.Contains("test"))
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = "Endringsmelding-grp-9786.Avgiver-grp-9787.OppgavegiverNavn-datadef-68.value",
                    Description = "test er ikke en gyldig verdi",
                    Severity = ValidationIssueSeverity.Error,
                });
            }
            if (!string.IsNullOrEmpty(comments) && comments.Contains("test"))
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = "Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].nested-grp-1234[0].SkattemeldingEndringEtterFristKommentar-datadef-37133.value",
                    Description = "test er ikke en gyldig verdi",
                    Severity = ValidationIssueSeverity.Error,
                });
            }
            if (newValue.HasValue && newValue == 0)
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = "Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].SkattemeldingEndringEtterFristNyttBelop-datadef-37132.value",
                    Description = "0 er ikke en gyldig verdi",
                    Severity = ValidationIssueSeverity.Error,
                });
            }

            var oppgaveGiverNavn = model?.Endringsmeldinggrp9786?.Avgivergrp9787?.OppgavegiverNavndatadef68?.value;
            if (!string.IsNullOrEmpty(oppgaveGiverNavn) && oppgaveGiverNavn.Contains("tull og tøys"))
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = "Endringsmelding-grp-9786.Avgiver-grp-9787.OppgavegiverNavn-datadef-68.value",
                    Description = "Tullevalidering",
                    Severity = ValidationIssueSeverity.Error,
                });
            }

            if (model?.sumAll == 9044622)
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = "sumAll",
                    Description = "9044622 er et magisk tall som ikke er tillatt!",
                    Severity = ValidationIssueSeverity.Error,
                });
            }

            // Iterate pets and check for duplicates (same name and species). Iterate the list once first to get the
            // number of instances of each combination.
            var numPetInstances = new Dictionary<string, int>();
            foreach (var pet in model?.Pets ?? new List<Pet>())
            {
                var key = $"{pet.Name}-{pet.Species}";
                if (numPetInstances.ContainsKey(key))
                {
                    numPetInstances[key]++;
                }
                else
                {
                    numPetInstances[key] = 1;
                }
            }
            // Then iterate the list again and add validation issues for each duplicate.
            foreach (var rowIdx in Enumerable.Range(0, model?.Pets?.Count ?? 0))
            {
                var pet = model?.Pets?[rowIdx];
                if (pet == null)
                {
                    continue;
                }
                var key = $"{pet.Name}-{pet.Species}";
                if (numPetInstances[key] > 1)
                {
                    validationIssues.Add(new ValidationIssue
                    {
                        Field = $"Pets[{rowIdx}].Name",
                        CustomTextKey = "Pets.Validation.DuplicatePet",
                        Description = "This pet key combination is not unique",
                        Severity = ValidationIssueSeverity.Error,
                    });
                }
            }

            return Task.FromResult(validationIssues);
        }
    }
}
