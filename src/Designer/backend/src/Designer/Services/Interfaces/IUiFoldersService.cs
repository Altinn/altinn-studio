using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IUiFoldersService
{
    public Task<ValidationOnNavigation?> GetGlobalValidationOnNavigationSettings(
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken
    );

    public Task SaveGlobalValidationOnNavigationSettings(
        AltinnRepoEditingContext editingContext,
        ValidationOnNavigation? validationOnNavigation,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<TaskNavigationGroupDto>> GetGlobalTaskNavigationSettingsDto(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    );

    public Task UpdateGlobalTaskNavigationSettings(
        AltinnRepoEditingContext editingContext,
        IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList,
        CancellationToken cancellationToken
    );
}
