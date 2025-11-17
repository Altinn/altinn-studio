using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic.Validation
{
    public class ChangeNameValidator : IFormDataValidator
    {
        public string DataType { get; } = "ServiceModel-test";

        public bool HasRelevantChanges(object current, object previous)
        {
            return true;
        }

        public Task<List<ValidationIssue>> ValidateFormData(Instance instance, DataElement dataElement, object data, string language)
        {
            List<ValidationIssue> validationIssues = new List<ValidationIssue>();

            Skjema model = (Skjema)data;
            string middleName = model?.NyttNavngrp9313?.NyttNavngrp9314?.PersonMellomnavnNyttdatadef34759?.value;
            string firstName = model?.NyttNavngrp9313?.NyttNavngrp9314?.PersonFornavnNyttdatadef34758?.value;
            string modelMiddleName = "NyttNavn-grp-9313.NyttNavn-grp-9314.PersonMellomnavnNytt-datadef-34759.value";
            string modelFirstName = "NyttNavn-grp-9313.NyttNavn-grp-9314.PersonFornavnNytt-datadef-34758.value";
            string modelChangesFirstName =
                "Innledning-grp-9309.NavneendringenGjelderFor-grp-9310.SubjektFornavnFolkeregistrert-datadef-34730.value";

            if (!string.IsNullOrEmpty(middleName) && middleName.Contains("test"))
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = modelMiddleName,
                    Description = "test er ikke en gyldig verdi",
                    Severity = ValidationIssueSeverity.Warning,
                });

                validationIssues.Add(new ValidationIssue
                {
                    Field = modelChangesFirstName,
                    Description = "test er ikke en gyldig verdi",
                    Severity = ValidationIssueSeverity.Warning,
                });
            }

            if (!string.IsNullOrEmpty(middleName) && middleName.Contains("info"))
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = modelMiddleName,
                    Description = "Dette er en infomelding",
                    Severity = ValidationIssueSeverity.Informational,
                });
            }

            if (!string.IsNullOrEmpty(middleName) && middleName.Contains("success"))
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = modelMiddleName,
                    Description = "Dette er en sukessmelding",
                    Severity = ValidationIssueSeverity.Success,
                });
            }

            if (string.IsNullOrEmpty(firstName))
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = modelFirstName,
                    Description = "Feltet er påkrevd (fra backend)",
                    Severity = ValidationIssueSeverity.Error,
                });
            }

            if (!string.IsNullOrEmpty(firstName) && firstName.Contains("test"))
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = modelFirstName,
                    Description = "Her er det en feil med egen tekstnøkkel",
                    CustomTextKey = "error.testValue",
                    Severity = ValidationIssueSeverity.Error,
                });
            }

            string modelRadios = "Radioknapp";
            string modelCheckboxes = "NyttNavn-grp-9313.NyttNavn-grp-9314.PersonBekrefterNyttNavn.value";
            if (!string.IsNullOrEmpty(firstName) && firstName.Equals("ErrorOnCheckboxesAndRadios"))
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = modelRadios,
                    Description = "Ugyldig valg 1",
                    Severity = ValidationIssueSeverity.Error,
                });
                validationIssues.Add(new ValidationIssue
                {
                    Field = modelCheckboxes,
                    Description = "Ugyldig valg 2",
                    Severity = ValidationIssueSeverity.Error,
                });
            }

            if (model?.GridData?.TotalProsent != 100)
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = "GridData.TotalProsent",
                    Description = "Må summeres opp til 100%",
                    Severity = ValidationIssueSeverity.Error,
                });
            }

            if (model?.GridData?.Kredittkort?.Prosent == 44)
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = "neverValidatedInput",
                    Description = "Valideringsmelding på felt som aldri vises (ikke skriv 44% på kredittkort!)",
                    Severity = ValidationIssueSeverity.Error,
                });
            }

            if (model.FilteredOptions?.Ingredients != null)
            {
                // Iterate the ingredients and figure out if there are any duplicates. If there are, the rows
                // with duplicates (not the original ones) should be marked with a validation issue.
                var foundTypes = new Dictionary<decimal?, bool>();
                foreach (var index in Enumerable.Range(0, model.FilteredOptions.Ingredients.Count))
                {
                    var type = model.FilteredOptions.Ingredients[index].Type;
                    if (type != null && !foundTypes.TryAdd(type, true))
                    {
                        validationIssues.Add(new ValidationIssue
                        {
                            Field = $"FilteredOptions.Ingredients[{index}].Type",
                            Description = "Du kan ikke ha flere ingredienser av samme type",
                            Severity = ValidationIssueSeverity.Error,
                        });
                    }
                }
            }

            return Task.FromResult(validationIssues);
        }

    }
}
