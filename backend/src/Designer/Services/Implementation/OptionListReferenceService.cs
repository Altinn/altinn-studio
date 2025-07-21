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
    private LayoutSetsModel _layoutSetsModel;

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
        if (_repoOptionListIds.Count > 0)
        {
            _layoutSetsModel = await _appDevelopmentService.GetLayoutSetsExtended(editingContext, cancellationToken);
            await AddReferences(cancellationToken);
        }

        return _optionListReferences;
    }

    private async Task AddReferences(CancellationToken cancellationToken)
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
            bool componentReferencesOptionList = TryGetOptionsIdFromComponent(component, out string optionListId);
            if (componentReferencesOptionList && OptionListIdExistsInRepo(optionListId))
            {
                string componentId = GetComponentId(component);
                AddComponentReference(layoutSetName, layoutName, componentId, optionListId);
            }
        }
    }

    private void AddComponentReference(string layoutSetName, string layoutName, string componentId, string optionListId)
    {
        var existingReference = RetrieveOptionListReference(optionListId);
        if (existingReference is null)
        {
            var newReference = CreateOptionListReference(optionListId, layoutSetName, layoutName, componentId);
            _optionListReferences.Add(newReference);
            return;
        }

        var existingSource = RetrieveOptionListIdSource(existingReference, layoutSetName, layoutName);
        if (existingSource is null)
        {
            var newSource = CreateOptionListIdSource(layoutSetName, layoutName, componentId);
            existingReference.OptionListIdSources.Add(newSource);
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

    private static bool TryGetOptionsIdFromComponent(JsonNode component, out string optionsId)
    {
        optionsId = component["optionsId"]?.ToString();
        return !string.IsNullOrEmpty(optionsId);
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

    private OptionListReference CreateOptionListReference(string optionListId, string layoutSetName, string layoutName, string componentId)
    {
        var newSource = CreateOptionListIdSource(layoutSetName, layoutName, componentId);
        return new OptionListReference
        {
            OptionListId = optionListId,
            OptionListIdSources = [newSource]
        };
    }

    private OptionListIdSource CreateOptionListIdSource(string layoutSetName, string layoutName, string componentId)
    {
        var layoutSetModel = RetrieveLayoutSetModel(layoutSetName);
        return new OptionListIdSource
        {
            LayoutSetId = layoutSetName,
            LayoutName = layoutName,
            ComponentIds = [componentId],
            TaskId = layoutSetModel?.Task?.Id,
            TaskType = layoutSetModel?.Task?.Type
        };
    }

    private LayoutSetModel RetrieveLayoutSetModel(string layoutSetId)
    {
        return _layoutSetsModel.Sets.FirstOrDefault(set => set.Id == layoutSetId);
    }
}
