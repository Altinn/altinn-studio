using Altinn.Studio.Designer.Services.Interfaces;

public class LayoutsetsService : ILayoutsetsService
{
    private readonly IAppDevelopmentService _appDevelopmentService;

    public LayoutsetsService(IAppDevelopmentService appDevelopmentService)
    {
        _appDevelopmentService = appDevelopmentService;
    }

    public async Task<ValidationOnNavigation> GetGlobalValidationOnNavigationSettings(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        return await _appDevelopmentService.GetGlobalValidationOnNavigationSettings(editingContext, cancellationToken);
    }

    public async Task SaveGlobalValidationOnNavigationSettings(
        AltinnRepoEditingContext editingContext,
        ValidationOnNavigation? config,
        CancellationToken cancellationToken
    )
    {
        await _appDevelopmentService.SaveGlobalValidationOnNavigationSettings(
            editingContext,
            config,
            cancellationToken
        );
    }

    public async Task<IEnumerable<TaskNavigationGroupDto>> GetGlobalTaskNavigationSettings(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        var taskNavigationGroupList = await _appDevelopmentService.GetGlobalTaskNavigationSettings(
            editingContext,
            cancellationToken
        );
        var tasks = _appDevelopmentService.GetTasks(editingContext, cancellationToken);
        return taskNavigationGroupList.Select(taskNavigationGroup =>
            taskNavigationGroup.ToDto(
                (taskId) => tasks.FirstOrDefault(task => task.Id == taskId)?.ExtensionElements?.TaskExtension?.TaskType
            )
        );
    }

    public async Task UpdateGlobalTaskNavigationSettings(
        AltinnRepoEditingContext editingContext,
        IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList,
        CancellationToken cancellationToken
    )
    {
        await _appDevelopmentService.UpdateGlobalTaskNavigationSettings(
            editingContext,
            taskNavigationGroupDtoList.Select(dto => dto.ToDomain()),
            cancellationToken
        );
    }
}
