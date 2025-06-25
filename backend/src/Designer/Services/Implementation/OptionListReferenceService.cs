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
    private HashSet<string> _repoOptionListIds;

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
        _repoOptionListIds = _altinnAppGitRepository.GetOptionsListIds().ToHashSet();

        await AddLayoutSetReferences(cancellationToken);
        await AddTaskReferences(editingContext, cancellationToken);

        return _optionListReferences;
    }

    private async Task AddLayoutSetReferences(CancellationToken cancellationToken)
    {
        string[] layoutSetNames = _altinnAppGitRepository.GetLayoutSetNames();
        foreach (string layoutSetName in layoutSetNames)
        {
            await FindOptionListReferencesInLayoutSet(layoutSetName, cancellationToken);
        }
    }

    private async Task FindOptionListReferencesInLayoutSet(string layoutSetName, CancellationToken cancellationToken)
    {
        string[] layoutNames = _altinnAppGitRepository.GetLayoutNames(layoutSetName);
        foreach (string layoutName in layoutNames)
        {
            await FindOptionListReferencesInLayout(layoutSetName, layoutName, cancellationToken);
        }
    }

    private async Task FindOptionListReferencesInLayout(string layoutSetName, string layoutName, CancellationToken cancellationToken)
    {
        var layout = await _altinnAppGitRepository.GetLayout(layoutSetName, layoutName, cancellationToken);
        var components = GetComponentArray(layout);
        if (_repoOptionListIds.Count > 0 && components?.Count > 0)
        {
            FindOptionListReferencesInComponents(layoutSetName, layoutName, components);
        }
    }

    private void FindOptionListReferencesInComponents(string layoutSetName, string layoutName, JsonArray components)
    {
        foreach (var component in components)
        {
            string componentId = GetComponentId(component);
            string optionListId = GetComponentOptionsId(component);

            if (ComponentReferencesOptionList(optionListId) && OptionListIdExistsInRepo(optionListId))
            {
                AddComponentReference(layoutSetName, layoutName, componentId, optionListId);
            }
        }
    }

    private void AddComponentReference(string layoutSetName, string layoutName, string componentId, string optionListId)
    {
        var existingReference = RetrieveOptionListReference(optionListId);
        if (existingReference is null)
        {
            AddNewOptionListReference(optionListId, layoutSetName, layoutName, componentId);
            return;
        }

        var existingSource = RetrieveOptionListIdSource(existingReference, layoutSetName, layoutName);
        if (existingSource is null)
        {
            var source = CreateOptionListIdSource(layoutSetName, layoutName, componentId);
            existingReference.OptionListIdSources.Add(source);
            return;
        }

        existingSource.ComponentIds.Add(componentId);
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

    private static bool ComponentReferencesOptionList(string optionListId)
    {
        return !string.IsNullOrEmpty(optionListId);
    }

    private bool OptionListIdExistsInRepo(string optionListId)
    {
        return _repoOptionListIds.Contains(optionListId);
    }

    private OptionListReference RetrieveOptionListReference(string optionListId)
    {
        return _optionListReferences.FirstOrDefault(reference => reference.OptionListId == optionListId);
    }

    private static OptionListIdSource RetrieveOptionListIdSource(OptionListReference existingReference, string layoutSetName, string layoutName)
    {
        return existingReference.OptionListIdSources.FirstOrDefault(
            optionListIdSource =>
                optionListIdSource.LayoutSetId == layoutSetName
                && optionListIdSource.LayoutName == layoutName
        );
    }

    private static OptionListIdSource CreateOptionListIdSource(string layoutSetName, string layoutName, string componentId)
    {
        return new OptionListIdSource
        {
            LayoutSetId = layoutSetName,
            LayoutName = layoutName,
            ComponentIds = [componentId]
        };
    }

    private void AddNewOptionListReference(string optionListId, string layoutSetName, string layoutName, string componentId)
    {
        _optionListReferences.Add(
            new OptionListReference
            {
                OptionListId = optionListId,
                OptionListIdSources =
                [
                    new OptionListIdSource
                    {
                        LayoutSetId = layoutSetName,
                        LayoutName = layoutName,
                        ComponentIds = [componentId],
                    }
                ]
            }
        );
    }

    private async Task AddTaskReferences(AltinnRepoEditingContext editingContext, CancellationToken cancellationToken)
    {
        if (_optionListReferences.Count > 0)
        {
            var layoutSetsModel = await _appDevelopmentService.GetLayoutSetsExtended(editingContext, cancellationToken);
            AddTaskDataToOptionListReferences(layoutSetsModel);
        }
    }

    private void AddTaskDataToOptionListReferences(LayoutSetsModel layoutSetsModel)
    {
        foreach (var optionListIdSource in _optionListReferences.SelectMany(reference => reference.OptionListIdSources))
        {
            var layoutSetModel = layoutSetsModel.Sets.FirstOrDefault(set => set.Id == optionListIdSource.LayoutSetId);
            AddTaskDataToSourceFromLayoutSetModel(optionListIdSource, layoutSetModel);
        }
    }

    private static void AddTaskDataToSourceFromLayoutSetModel(OptionListIdSource optionListIdSource, LayoutSetModel layoutSetModel)
    {
        optionListIdSource.TaskId = layoutSetModel?.Task.Id;
        optionListIdSource.TaskType = layoutSetModel?.Task.Type;
    }
}
