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
    private readonly List<RefToOptionListSpecifier> _optionListReferences;
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
    public async Task<List<RefToOptionListSpecifier>> GetAllOptionListReferences(AltinnRepoEditingContext editingContext, CancellationToken cancellationToken = default)
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

        await FindOptionListReferencesInGivenLayoutSets(layoutSetNames, cancellationToken);
    }

    private async Task FindOptionListReferencesInGivenLayoutSets(string[] layoutSetNames, CancellationToken cancellationToken = default)
    {
        foreach (string layoutSetName in layoutSetNames)
        {
            await FindOptionListReferencesInLayoutSet(layoutSetName, cancellationToken);
        }
    }

    private async Task FindOptionListReferencesInLayoutSet(string layoutSetName, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string[] layoutNames = _altinnAppGitRepository.GetLayoutNames(layoutSetName);

        await FindOptionListReferencesInGivenLayouts(layoutSetName, layoutNames, cancellationToken);
    }

    private async Task FindOptionListReferencesInGivenLayouts(string layoutSetName, string[] layoutNames, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        foreach (string layoutName in layoutNames)
        {
            var layout = await _altinnAppGitRepository.GetLayout(layoutSetName, layoutName, cancellationToken);
            FindOptionListReferencesInLayout(layout, layoutSetName, layoutName);
        }
    }

    /// <summary>
    /// Finds all <see cref="RefToOptionListSpecifier"/> in a given layout.
    /// </summary>
    /// <param name="layout">The layout.</param>
    /// <param name="layoutSetName">The layoutSetName the layout belongs to.</param>
    /// <param name="layoutName">The name of the given layout.</param>
    /// <returns>A list of <see cref="RefToOptionListSpecifier"/>.</returns>
    private void FindOptionListReferencesInLayout(JsonNode layout, string layoutSetName, string layoutName)
    {
        string[] repoOptionListIds = _altinnAppGitRepository.GetOptionsListIds();
        var components = layout["data"]?["layout"] as JsonArray;
        if (repoOptionListIds.Length == 0 || components == null)
        {
            return;
        }

        FindOptionListReferencesInComponents(components, repoOptionListIds, layoutSetName, layoutName);
    }

    private void FindOptionListReferencesInComponents(JsonArray components, string[] repoOptionListIds, string layoutSetName, string layoutName)
    {
        foreach (var component in components)
        {
            string componentId = component["id"]?.ToString();
            string optionListId = component["optionsId"]?.ToString();

            if (!repoOptionListIds.Contains(optionListId) || string.IsNullOrEmpty(optionListId))
            {
                continue;
            }

            if (OptionListIdAlreadyOccurred(_optionListReferences, optionListId, out var existingRef))
            {
                if (OptionListIdAlreadyOccurredInLayout(existingRef, layoutSetName, layoutName, out var existingSource))
                {
                    AddComponentIdToExistingSource(componentId, existingSource);
                }
                else
                {
                    AddNewOptionListIdSource(existingRef, layoutSetName, layoutName, componentId);
                }
            }
            else
            {
                AddNewRefToOptionListSpecifier(_optionListReferences, optionListId, layoutSetName, layoutName, componentId);
            }
        }
    }

    private static bool OptionListIdAlreadyOccurred(List<RefToOptionListSpecifier> refToOptionListSpecifiers, string optionListId, out RefToOptionListSpecifier existingRef)
    {
        existingRef = refToOptionListSpecifiers.FirstOrDefault(refToOptionList => refToOptionList.OptionListId == optionListId);
        return existingRef != null;
    }

    private static bool OptionListIdAlreadyOccurredInLayout(RefToOptionListSpecifier refToOptionListSpecifier, string layoutSetName, string layoutName, out OptionListIdSource existingSource)
    {
        existingSource = refToOptionListSpecifier.OptionListIdSources.FirstOrDefault(
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

    private static void AddNewOptionListIdSource(RefToOptionListSpecifier refToOptionListSpecifier, string layoutSetName, string layoutName, string componentId)
    {
        refToOptionListSpecifier.OptionListIdSources.Add(
            new OptionListIdSource
            {
                LayoutSetId = layoutSetName,
                LayoutName = layoutName,
                ComponentIds = [componentId],
            }
        );
    }

    private static void AddNewRefToOptionListSpecifier(List<RefToOptionListSpecifier> refToOptionListSpecifiers, string optionListId, string layoutSetName, string layoutName, string componentId)
    {
        refToOptionListSpecifiers.Add(
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

    private static void AddTaskDataToOptionListReferences(List<RefToOptionListSpecifier> optionListReferences, LayoutSetsModel layoutSetsModel)
    {
        foreach (var reference in optionListReferences)
        {
            AddTaskDataToOptionListReference(reference, layoutSetsModel);
        }
    }

    private static void AddTaskDataToOptionListReference(RefToOptionListSpecifier reference, LayoutSetsModel layoutSetsModel)
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
