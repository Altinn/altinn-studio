using System;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Altinn.App.Models; // Uncomment this line to refer to app model(s)

namespace App.IntegrationTests.Mocks.Apps.tdd.frontendtest
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
                }
                if (!string.IsNullOrEmpty(firstName) && firstName.Contains("test"))
                {
                    validationResults.AddModelError("NyttNavn-grp-9313.NyttNavn-grp-9314.PersonFornavnNytt-datadef-34758.value", "test er ikke en gyldig verdi");
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
