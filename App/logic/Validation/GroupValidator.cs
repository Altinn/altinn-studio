using Altinn.App.Core.Features;
using Altinn.App.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.logic.Validation
{
    public class GroupValidator : IFormDataValidator
    {
        public string DataType { get; } = "nested-group";

        public bool ShouldRun(List<string> changedFields)
        {
            return true;
        }

        public Task<List<ValidationIssue>> ValidateFormData(Instance instance, DataElement dataElement, object data)
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

            return Task.FromResult(validationIssues);
        }
    }
}
