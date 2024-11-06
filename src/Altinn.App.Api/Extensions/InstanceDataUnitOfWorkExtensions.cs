using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models.Validation;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Extensions;

internal static class InstanceDataUnitOfWorkExtensions
{
    internal class FileValidationIssueProblemDetails : ProblemDetails
    {
        public List<ValidationIssueWithSource>? UploadValidationIssues { get; set; }
    }

    public static ProblemDetails? GetAbandonResponse(this InstanceDataUnitOfWork instanceDataUnitOfWork)
    {
        if (instanceDataUnitOfWork.HasAbandonIssues)
        {
            var issues = instanceDataUnitOfWork
                .AbandonIssues.Select(issue =>
                    ValidationIssueWithSource.FromIssue(issue, "DataProcessorAbandon", noIncrementalUpdates: false)
                )
                .ToList();
            return new FileValidationIssueProblemDetails
            {
                Title = "File validation failed",
                Detail = "Validation issues were found in the file upload",
                Status = 400,
                UploadValidationIssues = issues,
            };
        }

        return null;
    }
}
