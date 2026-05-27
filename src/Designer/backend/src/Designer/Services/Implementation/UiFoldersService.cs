using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Mappers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;

public class UiFoldersService : IUiFoldersService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

    public UiFoldersService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    }

    private AltinnAppGitRepository GetRepository(AltinnRepoEditingContext context) =>
        _altinnGitRepositoryFactory.GetAltinnAppGitRepository(context.Org, context.Repo, context.Developer);

    public async Task<IEnumerable<LayoutSetDto>> GetLayoutSetsExtended(
        AltinnRepoEditingContext altinnRepoEditingContext,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(altinnRepoEditingContext);

        IEnumerable<string> uiFolders = await altinnAppGitRepository.GetUiFolders(cancellationToken);
        Definitions definitions = altinnAppGitRepository.GetProcessDefinitions();
        // if uiFolder in UiFolders exists in defintions ids or is a subform, keep it.

        foreach (string uiFolder in uiFolders)
        {
            if (!definitions.Process.Tasks.Any(task => task.Id == uiFolder))
            {
                uiFolders = uiFolders.Where(folder => folder != uiFolder);
            }
        }

        List<LayoutSetModel> layoutSetsModel = new();

        foreach (string layoutSetName in uiFolders.ToList())
        {
            //se på try-catch metoden
            try
            {
                LayoutSettings layoutSettings = await altinnAppGitRepository.GetLayoutSettings(layoutSetName, cancellationToken);
                string taskType = TaskTypeFromDefinitions(definitions, layoutSetName);
                LayoutSetModel layoutSetModel = new()
                {
                    Id = layoutSetName,
                    DataType = layoutSettings?.DataType,
                    Type = layoutSettings?.Type,
                    Task = new TaskModel { Type = taskType },
                };
                layoutSetsModel.Add(layoutSetModel);
            }
            catch (System.IO.FileNotFoundException)
            {
                // If layout settings file is not found, we can ignore and continue with next layout set.
                continue;
            }
        }
        IEnumerable<LayoutSetDto> layoutSetDtoList = (await GetLayoutSetsDto(altinnRepoEditingContext, layoutSetsModel, cancellationToken)).ToList();

        return layoutSetDtoList;
    }

    public async Task<IEnumerable<LayoutSetDto>> GetLayoutSetsDto(
        AltinnRepoEditingContext altinnRepoEditingContext,
        IEnumerable<LayoutSetModel> layoutSetModels,
        CancellationToken cancellationToken
    )
    {
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(altinnRepoEditingContext);

        return await Task.WhenAll(
            layoutSetModels.Select(async (layoutSet) =>
            {
                LayoutSetDto layoutSetDto = layoutSet.ToDto();
                LayoutSettings layoutSettings = await altinnAppGitRepository.GetLayoutSettings(layoutSet.Id, cancellationToken);
                PagesDto pages = PagesDto.From(layoutSettings);
                layoutSetDto.PageCount =
                    pages.Groups != null ? pages.Groups.Sum(group => group.Pages.Count) : pages.Pages!.Count;
                return layoutSetDto;
            })
        );
    }

    private static string TaskTypeFromDefinitions(Definitions definitions, string taskId)
    {
        return definitions
                .Process.Tasks.FirstOrDefault(task => task.Id == taskId)
                ?.ExtensionElements?.TaskExtension?.TaskType
            ?? string.Empty;
    }

    public async Task<ValidationOnNavigation?> GetGlobalValidationOnNavigation(
        AltinnRepoEditingContext altinnRepoEditingContext,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(altinnRepoEditingContext);

        UiSettings globalSettingsFile = await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken);
        return globalSettingsFile?.ValidationOnNavigation;
    }

    public async Task SaveGlobalValidationOnNavigation(
        AltinnRepoEditingContext altinnRepoEditingContext,
        ValidationOnNavigation? config,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(altinnRepoEditingContext);

        UiSettings globalSettingsFile = await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken);
        globalSettingsFile ??= new UiSettings();
        globalSettingsFile.ValidationOnNavigation = config;
        await altinnAppGitRepository.SaveGlobalSettingsFile(globalSettingsFile);
    }

    public async Task<IEnumerable<TaskNavigationGroupDto>> GetGlobalTaskNavigationDto(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        IEnumerable<TaskNavigationGroup> taskNavigationGroups = await GetGlobalTaskNavigation(
            editingContext,
            cancellationToken
        );

        IEnumerable<ProcessTask> tasks = GetTasks(editingContext, cancellationToken);

        Dictionary<string, string?> taskTypesById = tasks.ToDictionary(
            task => task.Id,
            task => task.ExtensionElements?.TaskExtension?.TaskType
        );

        return taskNavigationGroups.Select(group => group.ToDto(taskId => taskTypesById.GetValueOrDefault(taskId)));
    }

    public async Task<List<TaskNavigationGroup>> GetGlobalTaskNavigation(
        AltinnRepoEditingContext altinnRepoEditingContext,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        AltinnAppGitRepository altinnAppGitRepository = GetRepository(altinnRepoEditingContext);

        UiSettings globalSettingsFile = await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken);
        return globalSettingsFile?.TaskNavigation?.ToList() ?? [];
    }

    public IEnumerable<ProcessTask> GetTasks(
        AltinnRepoEditingContext altinnRepoEditingContext,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(altinnRepoEditingContext);

        Definitions definitions = altinnAppGitRepository.GetProcessDefinitions();
        return definitions.Process.Tasks;
    }

    public async Task UpdateGlobalTaskNavigation(
        AltinnRepoEditingContext altinnRepoEditingContext,
        IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        AltinnAppGitRepository altinnAppGitRepository = GetRepository(altinnRepoEditingContext);

        IEnumerable<TaskNavigationGroup> taskNavigationGroupList = taskNavigationGroupDtoList.Select(x => x.ToDomain());

        UiSettings globalSettingsFile = await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken);

        globalSettingsFile ??= new UiSettings();

        globalSettingsFile.TaskNavigation = taskNavigationGroupList.Any() ? taskNavigationGroupList : null;

        await altinnAppGitRepository.SaveGlobalSettingsFile(globalSettingsFile);
    }
}
