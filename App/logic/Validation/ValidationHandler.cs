using System;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Altinn.App.Models; // Uncomment this line to refer to app model(s)
using System.Linq;

namespace Altinn.App.AppLogic.Validation
{
    public class ValidationHandler
    {
        private IHttpContextAccessor _httpContextAccessor;

        public ValidationHandler(IHttpContextAccessor httpContextAccessor = null)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task ValidateData(object data, ModelStateDictionary validationResults)
        {
            if (data.GetType() == typeof(Skjema))
            {
                Skjema model = (Skjema)data;
                string middleName = model?.NyttNavngrp9313?.NyttNavngrp9314?.PersonMellomnavnNyttdatadef34759?.value;
                string firstName = model?.NyttNavngrp9313?.NyttNavngrp9314?.PersonFornavnNyttdatadef34758?.value;
                if (!string.IsNullOrEmpty(middleName) && middleName.Contains("test"))
                {
                    validationResults.AddModelError("NyttNavn-grp-9313.NyttNavn-grp-9314.PersonMellomnavnNytt-datadef-34759.value", "*WARNING*test er ikke en gyldig verdi");
                    validationResults.AddModelError("Innledning-grp-9309.NavneendringenGjelderFor-grp-9310.SubjektFornavnFolkeregistrert-datadef-34730.value", "*WARNING*test er ikke en gyldig verdi");                    
                }
                if (!string.IsNullOrEmpty(middleName) && !middleName.Contains("test"))
                {
                    validationResults.AddModelError("NyttNavn-grp-9313.NyttNavn-grp-9314.PersonMellomnavnNytt-datadef-34759.value", "*FIXED*test er ikke en gyldig verdi");                    
                }
                if (string.IsNullOrEmpty(firstName))
                {
                    validationResults.AddModelError("NyttNavn-grp-9313.NyttNavn-grp-9314.PersonFornavnNytt-datadef-34758.value", "Feltet er påkrevd");
                }
                if (!string.IsNullOrEmpty(firstName) && firstName.Contains("test"))
                {
                    validationResults.AddModelError("NyttNavn-grp-9313.NyttNavn-grp-9314.PersonFornavnNytt-datadef-34758.value", "error.testValue");
                }
            }

            if (data.GetType() == typeof(NestedGroup))
            {
                NestedGroup model = (NestedGroup)data;
                String comments = model?.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788.FirstOrDefault()?.nestedgrp1234.FirstOrDefault()?.SkattemeldingEndringEtterFristKommentardatadef37133?.value;
                String name = model?.Endringsmeldinggrp9786?.Avgivergrp9787?.OppgavegiverNavndatadef68?.value;
                if (!string.IsNullOrEmpty(name) && name.Contains("test"))
                {
                    validationResults.AddModelError("Endringsmelding-grp-9786.Avgiver-grp-9787.OppgavegiverNavn-datadef-68.value", "Name cannot contain test");
                }
                if (!string.IsNullOrEmpty(name) && !name.Contains("test"))
                {
                    validationResults.AddModelError("Endringsmelding-grp-9786.Avgiver-grp-9787.OppgavegiverNavn-datadef-68.value", "*FIXED*Name cannot contain test");
                }
                if (!string.IsNullOrEmpty(comments) && comments.Contains("test"))
                {
                    validationResults.AddModelError("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].nested-grp-1234[0].SkattemeldingEndringEtterFristKommentar-datadef-37133.value", "Comments cannot contain test");
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
