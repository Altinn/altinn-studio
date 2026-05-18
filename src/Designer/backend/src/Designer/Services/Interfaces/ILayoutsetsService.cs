namespace Altinn.Studio.Designer.Services.Interfaces;

public interface ILayoutsetsService
{
    Task<ValidationOnNavigation> GetGlobalValidationOnNavigationSettings(AltinnRepoEditingContext editingContext, CancellationToken cancellationToken);
    Task SaveGlobalValidationOnNavigationSettings(AltinnRepoEditingContext editingContext, ValidationOnNavigation? config, CancellationToken cancellationToken);
    Task<IEnumerable<TaskNavigationGroupDto>> GetGlobalTaskNavigationSettings(AltinnRepoEditingContext editingContext, CancellationToken cancellationToken);
    Task UpdateGlobalTaskNavigationSettings(AltinnRepoEditingContext editingContext, IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList, CancellationToken cancellationToken);
}
