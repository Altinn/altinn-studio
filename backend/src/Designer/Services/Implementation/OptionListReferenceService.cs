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
/// Service for handling option list references within layouts.
/// </summary>
public class OptionListReferenceService : IOptionListReferenceService
{
    private readonly List<OptionListReference> _optionListReferences;
    private readonly IAppDevelopmentService _appDevelopmentService;
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private AltinnAppGitRepository _altinnAppGitRepository;

    /// <summary>
    /// Initializes a new instance of the <see cref="OptionListReferenceService"/> class.
    /// </summary>
    /// <param name="altinnGitRepositoryFactory">The git repository factory.</param>
    /// <param name="appDevelopmentService">The app development service.</param>
    public OptionListReferenceService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IAppDevelopmentService appDevelopmentService)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _appDevelopmentService = appDevelopmentService;
        _optionListReferences = [];
    }

    /// <inheritdoc />
    public async Task<List<OptionListReference>> GetAllOptionListReferences(AltinnRepoEditingContext editingContext, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(editingContext.Org, editingContext.Repo, editingContext.Developer);

        await AddLayoutSetReferences(cancellationToken);
        await AddTaskReferences(editingContext, cancellationToken);

        return _optionListReferences;
    }

    private async Task AddLayoutSetReferences(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string[] layoutSetNames = _altinnAppGitRepository.GetLayoutSetNames();
        foreach (string layoutSetName in layoutSetNames)
        {
            await FindOptionListReferencesInLayoutSet(layoutSetName, cancellationToken);
        }
    }

    private async Task FindOptionListReferencesInLayoutSet(string layoutSetName, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string[] layoutNames = _altinnAppGitRepository.GetLayoutNames(layoutSetName);
        foreach (string layoutName in layoutNames)
        {
            await FindOptionListReferencesInLayout(layoutSetName, layoutName, cancellationToken);
        }
    }

    private async Task FindOptionListReferencesInLayout(string layoutSetName, string layoutName, CancellationToken cancellationToken = default)
    {
        string[] repoOptionListIds = _altinnAppGitRepository.GetOptionsListIds();
        var layout = await _altinnAppGitRepository.GetLayout(layoutSetName, layoutName, cancellationToken);
        var components = GetComponentArray(layout);
        if (repoOptionListIds.Length > 0 && components?.Count > 0)
        {
            FindOptionListReferencesInComponents(layoutSetName, layoutName, components, repoOptionListIds);
        }
    }

    private void FindOptionListReferencesInComponents(string layoutSetName, string layoutName, JsonArray components, string[] repoOptionListIds)
    {
        foreach (var component in components)
        {
            string componentId = GetComponentId(component);
            string optionListId = GetComponentOptionsId(component);

            if (ComponentReferencesOptionList(component) && OptionListIdExistsInRepo(optionListId, repoOptionListIds))
            {
                AddComponentReference(layoutSetName, layoutName, componentId, optionListId);
            }
        }
    }

    private void AddComponentReference(string layoutSetName, string layoutName, string componentId, string optionListId)
    {
        if (OptionListIdAlreadyReferenced(optionListId, out var existingRef))
        {
            AppendOptionListReference(existingRef, layoutSetName, layoutName, componentId);
        }
        else
        {
            AddNewOptionListReference(optionListId, layoutSetName, layoutName, componentId);
        }
    }

    private static void AppendOptionListReference(OptionListReference existingRef, string layoutSetName, string layoutName, string componentId)
    {
        if (OptionListIdAlreadyReferencedInLayout(existingRef, layoutSetName, layoutName, out var existingSource))
        {
            AddComponentIdToExistingSource(componentId, existingSource);
        }
        else
        {
            AddNewOptionListIdSource(existingRef, layoutSetName, layoutName, componentId);
        }
    }

    private static JsonArray GetComponentArray(JsonNode layout)
    {
        return layout["data"]?["layout"] as JsonArray;
    }

    private static string GetComponentId(JsonNode component)
    {
        return component["id"]?.ToString();
    }

    private static string GetComponentOptionsId(JsonNode component)
    {
        return component["optionsId"]?.ToString();
    }

    private static bool ComponentReferencesOptionList(JsonNode component)
    {
        string optionListId = GetComponentOptionsId(component);
        return !string.IsNullOrEmpty(optionListId);
    }

    private static bool OptionListIdExistsInRepo(string optionListId, string[] repoOptionListIds)
    {
        return repoOptionListIds.Contains(optionListId);
    }

    private bool OptionListIdAlreadyReferenced(string optionListId, out OptionListReference existingRef)
    {
        existingRef = _optionListReferences.FirstOrDefault(reference => reference.OptionListId == optionListId);
        return existingRef != null;
    }

    private static bool OptionListIdAlreadyReferencedInLayout(OptionListReference optionListReference, string layoutSetName, string layoutName, out OptionListIdSource existingSource)
    {
        existingSource = optionListReference.OptionListIdSources.FirstOrDefault(
            optionListIdSource =>
                optionListIdSource.LayoutSetId == layoutSetName
                && optionListIdSource.LayoutName == layoutName
        );
        return existingSource != null;
    }

    private static void AddComponentIdToExistingSource(string componentId, OptionListIdSource existingSource)
    {
        existingSource.ComponentIds.Add(componentId);
    }

    private static void AddNewOptionListIdSource(OptionListReference optionListReference, string layoutSetName, string layoutName, string componentId)
    {
        optionListReference.OptionListIdSources.Add(
            new OptionListIdSource
            {
                LayoutSetId = layoutSetName,
                LayoutName = layoutName,
                ComponentIds = [componentId],
            }
        );
    }

    private void AddNewOptionListReference(string optionListId, string layoutSetName, string layoutName, string componentId)
    {
        _optionListReferences.Add(
            new()
            {
                OptionListId = optionListId,
                OptionListIdSources =
                [
                    new OptionListIdSource
                    {
                        LayoutSetId = layoutSetName,
                        LayoutName = layoutName,
                        ComponentIds = [componentId],
                    },
                ],
            }
        );
    }

    private async Task AddTaskReferences(AltinnRepoEditingContext editingContext, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (_optionListReferences.Count > 0)
        {
            LayoutSetsModel layoutSetsModel = await _appDevelopmentService.GetLayoutSetsExtended(editingContext, cancellationToken);
            AddTaskDataToOptionListReferences(_optionListReferences, layoutSetsModel);
        }
    }

    private static void AddTaskDataToOptionListReferences(List<OptionListReference> optionListReferences, LayoutSetsModel layoutSetsModel)
    {
        foreach (var reference in optionListReferences)
        {
            AddTaskDataToOptionListReference(reference, layoutSetsModel);
        }
    }

    private static void AddTaskDataToOptionListReference(OptionListReference reference, LayoutSetsModel layoutSetsModel)
    {
        foreach (var source in reference.OptionListIdSources)
        {
            AddTaskDataToSourceFromLayoutSetModels(source, layoutSetsModel);
        }
    }

    private static void AddTaskDataToSourceFromLayoutSetModels(OptionListIdSource source, LayoutSetsModel layoutSetsModel)
    {
        var layoutSetModel = FindLayoutSetModelBySourceId(layoutSetsModel, source.LayoutSetId);
        AddTaskDataToSource(source, layoutSetModel);
    }

    private static LayoutSetModel FindLayoutSetModelBySourceId(LayoutSetsModel layoutSetsModels, string sourceId)
    {
        return layoutSetsModels.Sets.FirstOrDefault(set => set.Id == sourceId);
    }

    private static void AddTaskDataToSource(OptionListIdSource source, LayoutSetModel layoutSetModel)
    {
        source.TaskId = layoutSetModel?.Task.Id;
        source.TaskType = layoutSetModel?.Task.Type;
    }
}
