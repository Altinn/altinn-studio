using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Bootstrap;

internal interface IInitialValidationService
{
    Task<List<ValidationIssueWithSource>> Validate(
        Instance instance,
        string taskId,
        string language,
        CancellationToken cancellationToken = default
    );
}
