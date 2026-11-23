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

    /// <summary>
    /// The problem to return when a processor abandoned the changes, or <c>null</c> when none did. The title and
    /// detail default to the file upload wording; an endpoint that is not a file upload passes its own.
    /// </summary>
    public static ProblemDetails? GetAbandonResponse(
        this InstanceDataUnitOfWork instanceDataUnitOfWork,
        string title = "File validation failed",
        string detail = "Validation issues were found in the file upload"
    )
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
                Title = title,
                Detail = detail,
                Status = 400,
                UploadValidationIssues = issues,
            };
        }

        return null;
    }
}
