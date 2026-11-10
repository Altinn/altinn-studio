using Altinn.App.Core.Models.Validation;
using Altinn.App.Models.Moped;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic;

public class MopedComponentValidator : IFormDataValidator
{
    public string DataType => "moped";

    public bool HasRelevantChanges(object current, object previous) => true;

    public Task<List<ValidationIssue>> ValidateFormData(
        Instance instance,
        DataElement dataElement,
        object data,
        string? language
    )
    {
        var moped = (Moped)data;
        List<ValidationIssue> issues = [];
        if (moped.Modell == "component-error")
        {
            // The IFormDataValidator wrapper supplies DataElementId. Field is deliberately omitted.
            issues.Add(
                new ValidationIssue
                {
                    ComponentId = "moped-modell",
                    Description = $"Component-only error for {moped.RegNo}",
                    Severity = ValidationIssueSeverity.Error,
                }
            );
        }

        return Task.FromResult(issues);
    }
}
