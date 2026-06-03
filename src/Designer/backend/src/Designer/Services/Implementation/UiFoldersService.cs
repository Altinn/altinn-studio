using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Mappers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

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

    public async Task<IEnumerable<LayoutSetDto>> GetLayoutSetsExtended(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext);

        IEnumerable<string> uiFolders = await altinnAppGitRepository.GetUiFolders(cancellationToken);
        Definitions definitions = altinnAppGitRepository.GetProcessDefinitions();

        List<LayoutSetDto> layoutSets = [];

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
                PagesDto pages = PagesDto.From(layoutSettings);
                int pageCount =
                    pages.Groups != null ? pages.Groups.Sum(group => group.Pages.Count) : pages.Pages!.Count;

                layoutSets.Add(
                    new LayoutSetDto
                    {
                        Id = layoutSetName,
                        DataType = layoutSettings.DataType,
                        Type = layoutSettings.Type,
                        Task = taskType != null ? new TaskModel { Type = taskType } : null,
                        PageCount = pageCount,
                    }
                );
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

    public async Task<Dictionary<string, ValidationOnNavigation?>> GetLayoutSetsValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        IEnumerable<string> layoutSetIds,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository repository = GetRepository(editingContext);
        Dictionary<string, ValidationOnNavigation?> results = [];
        foreach (string layoutSetId in layoutSetIds)
        {
            try
            {
                LayoutSettings layoutSettings = await repository.GetLayoutSettings(layoutSetId, cancellationToken);
                results[layoutSetId] = layoutSettings.Pages?.ValidationOnNavigation;
            }
            catch (Exception e) when (e is FileNotFoundException or JsonException)
            {
                _logger.LogWarning(e, "Could not read Settings.json for layout set {LayoutSetId}. Skipping.", layoutSetId);
            }
        }
        return results;
    }

    public async Task SaveLayoutSetsValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        IEnumerable<string> layoutSetIds,
        ValidationOnNavigation? config,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository repository = GetRepository(editingContext);
        foreach (string layoutSetId in layoutSetIds)
        {
            LayoutSettings layoutSettings = await repository.GetLayoutSettings(layoutSetId, cancellationToken);
            layoutSettings.Pages ??= new Pages();
            layoutSettings.Pages.ValidationOnNavigation = config;
            await repository.SaveLayoutSettings(layoutSetId, layoutSettings);
        }
    }

    public async Task<Dictionary<string, ValidationOnNavigation?>> GetPagesValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        string layoutSetId,
        IEnumerable<string> pageIds,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository repository = GetRepository(editingContext);
        Dictionary<string, ValidationOnNavigation?> results = [];
        foreach (string pageId in pageIds)
        {
            try
            {
                JsonNode layout = await repository.GetLayout(layoutSetId, pageId, cancellationToken);
                results[pageId] = layout["data"]?["validationOnNavigation"]?.Deserialize<ValidationOnNavigation>();
            }
            catch (Exception e) when (e is FileNotFoundException or JsonException)
            {
                _logger.LogWarning(e, "Could not read layout file for page {PageId} in layout set {LayoutSetId}. Skipping.", pageId, layoutSetId);
            }
        }
        return results;
    }

    public async Task SavePagesValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        string layoutSetId,
        IEnumerable<string> pageIds,
        ValidationOnNavigation? config,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository repository = GetRepository(editingContext);
        foreach (string pageId in pageIds)
        {
            JsonNode layout = await repository.GetLayout(layoutSetId, pageId, cancellationToken);

            if (config == null)
            {
                layout["data"]?.AsObject().Remove("validationOnNavigation");
            }
            else
            {
                JsonObject data = layout["data"]?.AsObject() ?? [];
                data["validationOnNavigation"] = JsonSerializer.SerializeToNode(config);
                layout["data"] = data;
            }

            await repository.SaveLayout(layoutSetId, pageId, layout, cancellationToken);
        }
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
