using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Bootstrap;

internal sealed class InitialValidationService : IInitialValidationService
{
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;
    private readonly IValidationService _validationService;

    public InitialValidationService(
        InstanceDataUnitOfWorkInitializer instanceDataUnitOfWorkInitializer,
        IValidationService validationService
    )
    {
        _instanceDataUnitOfWorkInitializer = instanceDataUnitOfWorkInitializer;
        _validationService = validationService;
    }

    public async Task<List<ValidationIssueWithSource>> Validate(
        Instance instance,
        string taskId,
        string language,
        CancellationToken cancellationToken = default
    )
    {
        _ = cancellationToken;
        var dataAccessor = await _instanceDataUnitOfWorkInitializer.Init(instance, taskId, language);
        return await _validationService.ValidateInstanceAtTask(
            dataAccessor,
            taskId,
            ignoredValidators: null,
            onlyIncrementalValidators: true,
            language
        );
    }
}
