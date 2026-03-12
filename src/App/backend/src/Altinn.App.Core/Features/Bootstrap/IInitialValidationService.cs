using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Features.Bootstrap;

internal interface IInitialValidationService
{
    Task<List<ValidationIssueWithSource>> Validate(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        string language,
        CancellationToken cancellationToken = default
    );
}
