using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Features.Bootstrap;

internal sealed class InitialValidationService : IInitialValidationService
{
    private readonly IValidationService _validationService;

    public InitialValidationService(IValidationService validationService)
    {
        _validationService = validationService;
    }

    public async Task<List<ValidationIssueWithSource>> Validate(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        string language,
        CancellationToken cancellationToken = default
    )
    {
        _ = cancellationToken;
        return await _validationService.ValidateInstanceAtTask(
            dataAccessor,
            taskId,
            ignoredValidators: null,
            onlyIncrementalValidators: true,
            language
        );
    }
}
