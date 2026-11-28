using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Finds the components that use the app's code lists through <c>optionsId</c>.
/// </summary>
public class OptionListReferenceService(
    IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
    IAppDevelopmentService appDevelopmentService,
    IAppVersionService appVersionService,
    IUiFoldersService uiFoldersService
) : IOptionListReferenceService
{
    /// <inheritdoc />
    public async Task<List<OptionListReference>> GetAllOptionListReferences(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository repository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            editingContext.Org,
            editingContext.Repo,
            editingContext.Developer
        );
        HashSet<string> optionListIds = [.. repository.GetOptionsListIds()];
        if (optionListIds.Count == 0)
        {
            return [];
        }

        List<OptionListReference> references = [];
        foreach (LayoutFolder folder in await GetLayoutFolders(editingContext, repository, cancellationToken))
        {
            foreach (string layoutName in repository.GetLayoutNames(folder.LayoutSetId))
            {
                JsonNode layout = await repository.GetLayout(folder.LayoutSetId, layoutName, cancellationToken);
                AddReferences(references, optionListIds, folder, layoutName, layout);
            }
        }

        return references;
    }

    /// <inheritdoc />
    public async Task<bool> IsOptionListInUse(
        AltinnRepoEditingContext editingContext,
        string optionListId,
        CancellationToken cancellationToken = default
    )
    {
        List<OptionListReference> references = await GetAllOptionListReferences(editingContext, cancellationToken);
        return references.Exists(reference => reference.OptionListId == optionListId);
    }

    private async Task<IEnumerable<LayoutFolder>> GetLayoutFolders(
        AltinnRepoEditingContext editingContext,
        AltinnAppGitRepository repository,
        CancellationToken cancellationToken
    )
    {
        if (appVersionService.IsV9App(editingContext))
        {
            return await GetUiFolders(editingContext, repository, cancellationToken);
        }

        // The v8 code is frozen, and Designer has never searched a v8 app without layout sets.
        return repository.AppUsesLayoutSets()
            ? await GetLayoutSetFolders(editingContext, repository, cancellationToken)
            : [];
    }

    /// <summary>
    /// A v9 app has no layout-sets.json. Its UI folders are named after their tasks, so a folder's name stands in
    /// for both the layout set and the task, as in the other editors. A subform, or a folder that no task uses,
    /// has no task. Every folder is searched, as every layout set folder is in a v8 app.
    /// </summary>
    private async Task<IEnumerable<LayoutFolder>> GetUiFolders(
        AltinnRepoEditingContext editingContext,
        AltinnAppGitRepository repository,
        CancellationToken cancellationToken
    )
    {
        IEnumerable<string> folderNames;
        try
        {
            folderNames = await repository.GetUiFolders(cancellationToken);
        }
        catch (LibGit2Sharp.NotFoundException)
        {
            return [];
        }

        Dictionary<string, UiFolderLayoutSetDto> layoutSets = (
            await uiFoldersService.GetLayoutSets(editingContext, cancellationToken)
        ).ToDictionary(layoutSet => layoutSet.Id, StringComparer.Ordinal);

        return folderNames.Select(folderName =>
        {
            UiFolderLayoutSetDto? layoutSet = layoutSets.GetValueOrDefault(folderName);
            bool belongsToTask = layoutSet is not null && layoutSet.Type != Constants.General.SubformId;
            return new LayoutFolder(folderName, belongsToTask ? folderName : null, layoutSet?.TaskType);
        });
    }

    private async Task<IEnumerable<LayoutFolder>> GetLayoutSetFolders(
        AltinnRepoEditingContext editingContext,
        AltinnAppGitRepository repository,
        CancellationToken cancellationToken
    )
    {
        LayoutSetsModel layoutSetsModel = await appDevelopmentService.GetLayoutSetsExtended(
            editingContext,
            cancellationToken
        );
        return repository
            .GetLayoutSetNames()
            .Select(layoutSetName =>
            {
                TaskModel? task = layoutSetsModel.Sets.Find(set => set.Id == layoutSetName)?.Task;
                return new LayoutFolder(layoutSetName, task?.Id, task?.Type);
            });
    }

    private static void AddReferences(
        List<OptionListReference> references,
        HashSet<string> optionListIds,
        LayoutFolder folder,
        string layoutName,
        JsonNode layout
    )
    {
        if (layout["data"]?["layout"] is not JsonArray components)
        {
            return;
        }

        foreach (JsonNode? component in components)
        {
            string? optionListId = component?["optionsId"]?.ToString();
            if (string.IsNullOrEmpty(optionListId) || !optionListIds.Contains(optionListId))
            {
                continue;
            }

            string? componentId = component?["id"]?.ToString();
            AddComponentReference(references, optionListId, folder, layoutName, componentId);
        }
    }

    private static void AddComponentReference(
        List<OptionListReference> references,
        string optionListId,
        LayoutFolder folder,
        string layoutName,
        string? componentId
    )
    {
        OptionListReference? reference = references.Find(existing => existing.OptionListId == optionListId);
        if (reference is null)
        {
            reference = new OptionListReference { OptionListId = optionListId, OptionListIdSources = [] };
            references.Add(reference);
        }

        OptionListIdSource? source = reference.OptionListIdSources.Find(existing =>
            existing.LayoutSetId == folder.LayoutSetId && existing.LayoutName == layoutName
        );
        if (source is null)
        {
            source = new OptionListIdSource
            {
                LayoutSetId = folder.LayoutSetId,
                LayoutName = layoutName,
                ComponentIds = [],
                TaskId = folder.TaskId,
                TaskType = folder.TaskType,
            };
            reference.OptionListIdSources.Add(source);
        }

        source.ComponentIds.Add(componentId);
    }

    private sealed record LayoutFolder(string LayoutSetId, string? TaskId, string? TaskType);
}
