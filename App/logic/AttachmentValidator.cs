using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic
{
    public class AttachmentValidator : IDataElementValidator
    {
        public string DataType { get; } = "attachments";

        public async Task<List<ValidationIssue>> ValidateDataElement(Instance instance, DataElement dataElement, DataType dataType, string language)
        {
            List<ValidationIssue> validationIssues = new List<ValidationIssue>();

            if (dataElement.Filename == "whatever.png")
            {
                validationIssues.Add(new ValidationIssue
                {
                    Field = "AttachmentId",
                    Description = "You cannot upload a file named whatever.png",
                    Severity = ValidationIssueSeverity.Error,
                });
            }

            return validationIssues;
        }
    }
}