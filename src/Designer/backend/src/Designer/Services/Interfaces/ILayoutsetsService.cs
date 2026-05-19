using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface ILayoutsetsService
{
    public Task<ValidationOnNavigation> GetGlobalValidationOnNavigationSettings(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    );
    public Task SaveGlobalValidationOnNavigationSettings(
        AltinnRepoEditingContext editingContext,
        ValidationOnNavigation? validationOnNavigation,
        CancellationToken cancellationToken
    );
    Task<IEnumerable<TaskNavigationGroupDto>> GetGlobalTaskNavigationSettings(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    );
    public Task UpdateGlobalTaskNavigationSettings(
        AltinnRepoEditingContext editingContext,
        IEnumerable<TaskNavigationGroup> taskNavigationGroupList,
        CancellationToken cancellationToken
    );
}
