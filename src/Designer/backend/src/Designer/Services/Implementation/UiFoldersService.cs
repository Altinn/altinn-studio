using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Mappers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Logging;

public class UiFoldersService : IUiFoldersService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly ILogger<UiFoldersService> _logger;

    public UiFoldersService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, ILogger<UiFoldersService> logger)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _logger = logger;
    }

    private AltinnAppGitRepository GetRepository(AltinnRepoEditingContext editingContext) =>
        _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            editingContext.Org,
            editingContext.Repo,
            editingContext.Developer
        );

    public async Task<IEnumerable<LayoutSetDto>> GetLayoutSets(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        List<LayoutSetInfo> layoutSetInfos = await GetLayoutSetInfos(editingContext, cancellationToken);

        return [.. layoutSetInfos.Select(ToLayoutSetDto)];
    }

    public async Task<IEnumerable<LayoutSetDto>> GetLayoutSetsExtended(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        List<LayoutSetInfo> layoutSetInfos = await GetLayoutSetInfos(editingContext, cancellationToken);

        return
        [
            .. layoutSetInfos.Select(info =>
            {
                LayoutSetDto layoutSet = ToLayoutSetDto(info);

                PagesDto pages = PagesDto.From(info.LayoutSettings);
                layoutSet.PageCount =
                    pages.Groups != null ? pages.Groups.Sum(group => group.Pages.Count) : pages.Pages!.Count;

                return layoutSet;
            }),
        ];
    }

    private static LayoutSetDto ToLayoutSetDto(LayoutSetInfo info) =>
        new()
        {
            Id = info.LayoutSetName,
            DataType = info.LayoutSettings.DataType,
            Type = info.LayoutSettings.Type,
            Task = info.TaskType != null ? new TaskModel { Type = info.TaskType } : null,
        };

    /// <summary>
    /// Shared logic for resolving layout sets from the UI folders. Since v9 apps no longer have a
    /// layout-sets.json file, layout sets are derived from the UI folders combined with the process
    /// definitions. Only folders that are subforms or that match a process task are included.
    /// </summary>
    private async Task<List<LayoutSetInfo>> GetLayoutSetInfos(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext);

        IEnumerable<string> uiFolders = await altinnAppGitRepository.GetUiFolders(cancellationToken);
        Definitions definitions = altinnAppGitRepository.GetProcessDefinitions();

        List<LayoutSetInfo> layoutSets = [];

        foreach (string layoutSetName in uiFolders)
        {
            try
            {
                LayoutSettings layoutSettings = await altinnAppGitRepository.GetLayoutSettings(
                    layoutSetName,
                    cancellationToken
                );

                bool isSubform = layoutSettings.Type == "subform";
                bool hasMatchingTask = definitions.Process.Tasks.Any(task => task.Id == layoutSetName);

                if (!isSubform && !hasMatchingTask)
                {
                    continue;
                }

                string? taskType = hasMatchingTask ? TaskTypeFromDefinitions(definitions, layoutSetName) : null;

                layoutSets.Add(new LayoutSetInfo(layoutSetName, layoutSettings, taskType));
            }
            catch (Exception e) when (e is FileNotFoundException or JsonException)
            {
                _logger.LogWarning(
                    e,
                    "Could not read Settings.json for layout set {LayoutSetName}. Skipping.",
                    layoutSetName
                );
            }
        }

        return layoutSets;
    }

    private sealed record LayoutSetInfo(string LayoutSetName, LayoutSettings LayoutSettings, string? TaskType);

    private static string TaskTypeFromDefinitions(Definitions definitions, string taskId)
    {
        return definitions
                .Process.Tasks.FirstOrDefault(task => task.Id == taskId)
                ?.ExtensionElements?.TaskExtension?.TaskType
            ?? string.Empty;
    }

    public async Task<ValidationOnNavigation?> GetGlobalValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext);

        UiSettings globalSettingsFile = await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken);
        return globalSettingsFile?.ValidationOnNavigation;
    }

    public async Task SaveGlobalValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        ValidationOnNavigation? config,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext);

        UiSettings globalSettingsFile =
            await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken) ?? new UiSettings();

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
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext);

        UiSettings globalSettingsFile = await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken);
        return globalSettingsFile?.TaskNavigation?.ToList() ?? [];
    }

    public IEnumerable<ProcessTask> GetTasks(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext);

        Definitions definitions = altinnAppGitRepository.GetProcessDefinitions();
        return definitions.Process.Tasks;
    }

    public async Task UpdateGlobalTaskNavigation(
        AltinnRepoEditingContext editingContext,
        IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext);

        IEnumerable<TaskNavigationGroup> taskNavigationGroupList = taskNavigationGroupDtoList.Select(x => x.ToDomain());

        UiSettings globalSettingsFile =
            await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken) ?? new UiSettings();

        globalSettingsFile.TaskNavigation = taskNavigationGroupList.Any() ? taskNavigationGroupList : null;

        await altinnAppGitRepository.SaveGlobalSettingsFile(globalSettingsFile);
    }
}
