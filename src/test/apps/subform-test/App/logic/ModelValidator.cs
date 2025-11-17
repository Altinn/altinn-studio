using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Models.model;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic
{
    public class ModelValidator : IFormDataValidator
    {
        public string DataType { get; } = "model";

        public bool HasRelevantChanges(object current, object previous)
        {
            return true;
        }

        public async Task<List<ValidationIssue>> ValidateFormData(Instance instance, DataElement dataElement, object data, string language)
        {
            List<ValidationIssue> validationIssues = new List<ValidationIssue>();
            model model = (model)data;

            if (model.AttachmentName?.Count == 5)
            {
                validationIssues.Add(new ValidationIssue{
                    Field = "Navn",
                    Description = "You cannot have exactly 5 attachments",
                    Severity = ValidationIssueSeverity.Error,
                });
            }

            return validationIssues;
        }

    }
}
