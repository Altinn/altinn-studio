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

    public async Task<ValidationOnNavigation?> GetGlobalValidationOnNavigation(
        AltinnRepoEditingContext altinnRepoEditingContext,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            altinnRepoEditingContext.Org,
            altinnRepoEditingContext.Repo,
            altinnRepoEditingContext.Developer
        );

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
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            altinnRepoEditingContext.Org,
            altinnRepoEditingContext.Repo,
            altinnRepoEditingContext.Developer
        );

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

        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            altinnRepoEditingContext.Org,
            altinnRepoEditingContext.Repo,
            altinnRepoEditingContext.Developer
        );

        UiSettings globalSettingsFile = await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken);
        return globalSettingsFile?.TaskNavigation?.ToList() ?? [];
    }

    public IEnumerable<ProcessTask> GetTasks(
        AltinnRepoEditingContext altinnRepoEditingContext,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            altinnRepoEditingContext.Org,
            altinnRepoEditingContext.Repo,
            altinnRepoEditingContext.Developer
        );

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

        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            altinnRepoEditingContext.Org,
            altinnRepoEditingContext.Repo,
            altinnRepoEditingContext.Developer
        );

        IEnumerable<TaskNavigationGroup> taskNavigationGroupList = taskNavigationGroupDtoList.Select(x => x.ToDomain());

        UiSettings globalSettingsFile = await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken);

        globalSettingsFile ??= new UiSettings();

        globalSettingsFile.TaskNavigation = taskNavigationGroupList.Any() ? taskNavigationGroupList : null;

        await altinnAppGitRepository.SaveGlobalSettingsFile(globalSettingsFile);
    }
}
