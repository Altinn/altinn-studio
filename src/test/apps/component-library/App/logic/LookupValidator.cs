using Altinn.App.Core.Models.Validation;
using Altinn.App.Models.Model;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic;

public class LookupValidator : IFormDataValidator
{
    public string DataType => "model";

    public bool HasRelevantChanges(object current, object previous) => true;

    public Task<List<ValidationIssue>> ValidateFormData(
        Instance instance,
        DataElement dataElement,
        object data,
        string? language
    )
    {
        var model = (Model)data;
        var issues = new List<ValidationIssue>();
        if (model.LookupBackendValidation != "yes")
        {
            return Task.FromResult(issues);
        }

        AddPersonIssues(model.PersonLookup, nameof(Model.PersonLookup));
        AddOrganizationIssues(model.OrganizationLookup, nameof(Model.OrganizationLookup));
        if (model.PersonLookups != null)
        {
            for (var index = 0; index < model.PersonLookups.Count; index++)
            {
                AddPersonIssues(model.PersonLookups[index], $"{nameof(Model.PersonLookups)}[{index}]");
            }
        }
        if (model.OrganizationLookups != null)
        {
            for (var index = 0; index < model.OrganizationLookups.Count; index++)
            {
                AddOrganizationIssues(
                    model.OrganizationLookups[index],
                    $"{nameof(Model.OrganizationLookups)}[{index}]"
                );
            }
        }

        return Task.FromResult(issues);

        void AddPersonIssues(PersonLookupData? person, string prefix)
        {
            if (!string.IsNullOrEmpty(person?.Ssn))
            {
                AddIssues(
                    prefix,
                    nameof(PersonLookupData.Ssn),
                    nameof(PersonLookupData.FullName),
                    nameof(PersonLookupData.FirstName),
                    nameof(PersonLookupData.MiddleName),
                    nameof(PersonLookupData.LastName)
                );
            }
        }

        void AddOrganizationIssues(OrganizationLookupData? organization, string prefix)
        {
            if (!string.IsNullOrEmpty(organization?.OrgNr))
            {
                AddIssues(prefix, nameof(OrganizationLookupData.OrgNr), nameof(OrganizationLookupData.Name));
            }
        }

        void AddIssues(string prefix, params string[] fields)
        {
            foreach (var field in fields)
            {
                issues.Add(new ValidationIssue
                {
                    Field = $"{prefix}.{field}",
                    CustomTextKey = $"lookup.validation.{field}",
                    Severity = ValidationIssueSeverity.Error,
                });
            }
        }
    }
}
