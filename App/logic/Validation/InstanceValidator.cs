using Altinn.App.Core.Features;
using Altinn.App.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.App.logic.Validation
{
    public class InstanceValidator : IInstanceValidator
    {
        public async Task ValidateData(object data, ModelStateDictionary validationResults)
        {
            if (data.GetType() == typeof(Skjema))
            {
                Skjema model = (Skjema)data;
                string middleName = model?.NyttNavngrp9313?.NyttNavngrp9314?.PersonMellomnavnNyttdatadef34759?.value;
                string firstName = model?.NyttNavngrp9313?.NyttNavngrp9314?.PersonFornavnNyttdatadef34758?.value;
                string modelMiddleName = "NyttNavn-grp-9313.NyttNavn-grp-9314.PersonMellomnavnNytt-datadef-34759.value";
                string modelFirstName = "NyttNavn-grp-9313.NyttNavn-grp-9314.PersonFornavnNytt-datadef-34758.value";
                string modelChangesFirstName = "Innledning-grp-9309.NavneendringenGjelderFor-grp-9310.SubjektFornavnFolkeregistrert-datadef-34730.value";

                if (!string.IsNullOrEmpty(middleName) && middleName.Contains("test"))
                {
                    validationResults.AddModelError(modelMiddleName, "*WARNING*test er ikke en gyldig verdi");
                    validationResults.AddModelError(modelChangesFirstName, "*WARNING*test er ikke en gyldig verdi");
                }
                if (!string.IsNullOrEmpty(middleName) && middleName.Contains("info"))
                {
                    validationResults.AddModelError(modelMiddleName, "*INFO*Dette er en infomelding");
                }
                if (!string.IsNullOrEmpty(middleName) && middleName.Contains("success"))
                {
                    validationResults.AddModelError(modelMiddleName, "*SUCCESS*Dette er en sukessmelding");
                }
                if (!string.IsNullOrEmpty(middleName) && !middleName.Contains("test"))
                {
                    validationResults.AddModelError(modelMiddleName, "*FIXED*test er ikke en gyldig verdi");
                }
                if (string.IsNullOrEmpty(firstName))
                {
                    validationResults.AddModelError(modelFirstName, "Feltet er påkrevd (fra backend)");
                }
                if (!string.IsNullOrEmpty(firstName) && firstName.Contains("test"))
                {
                    validationResults.AddModelError(modelFirstName, "error.testValue");
                }

                string modelRadios = "Radioknapp";
                string modelCheckboxes = "NyttNavn-grp-9313.NyttNavn-grp-9314.PersonBekrefterNyttNavn.value";
                if (!string.IsNullOrEmpty(firstName) && firstName.Equals("ErrorOnCheckboxesAndRadios"))
                {
                    validationResults.AddModelError(modelCheckboxes, "Ugyldig valg 1");
                    validationResults.AddModelError(modelRadios, "Ugyldig valg 2");
                }
                else
                {
                    validationResults.AddModelError(modelCheckboxes, "*FIXED*Ugyldig valg 1");
                    validationResults.AddModelError(modelRadios, "*FIXED*Ugyldig valg 2");
                }

                if (model?.GridData?.TotalProsent != 100)
                {
                    validationResults.AddModelError("GridData.TotalProsent", "Må summeres opp til 100%");
                }

                if (model?.GridData?.Kredittkort?.Prosent == 44)
                {
                    validationResults.AddModelError(
                        "neverValidatedInput",
                        "Valideringsmelding på felt som aldri vises (ikke skriv 44% på kredittkort!)"
                    );
                }
            }

            if (data.GetType() == typeof(NestedGroup))
            {
                NestedGroup model = (NestedGroup)data;
                String comments = model?.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788.FirstOrDefault()?.nestedgrp1234.FirstOrDefault()?.SkattemeldingEndringEtterFristKommentardatadef37133?.value;
                String name = model?.Endringsmeldinggrp9786?.Avgivergrp9787?.OppgavegiverNavndatadef68?.value;
                var newValue = model?.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788?.FirstOrDefault()?.SkattemeldingEndringEtterFristNyttBelopdatadef37132?.value;
                if (!string.IsNullOrEmpty(name) && name.Contains("test"))
                {
                    validationResults.AddModelError("Endringsmelding-grp-9786.Avgiver-grp-9787.OppgavegiverNavn-datadef-68.value", "test er ikke en gyldig verdi");
                }
                if (!string.IsNullOrEmpty(name) && !name.Contains("test"))
                {
                    validationResults.AddModelError("Endringsmelding-grp-9786.Avgiver-grp-9787.OppgavegiverNavn-datadef-68.value", "*FIXED*test er ikke en gyldig verdi");
                }
                if (!string.IsNullOrEmpty(comments) && comments.Contains("test"))
                {
                    validationResults.AddModelError("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].nested-grp-1234[0].SkattemeldingEndringEtterFristKommentar-datadef-37133.value", "test er ikke en gyldig verdi");
                }
                if (newValue.HasValue && newValue == 0)
                {
                    validationResults.AddModelError("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].SkattemeldingEndringEtterFristNyttBelop-datadef-37132.value", "0 er ikke en gyldig verdi");
                }
            }
            await Task.CompletedTask;
        }

        public async Task ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;

        }
    }
}
