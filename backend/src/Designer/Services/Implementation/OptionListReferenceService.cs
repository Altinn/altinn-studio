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
/// Service for handling option list references within layouts.
/// </summary>
public class OptionListReferenceService : IOptionListReferenceService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IAppDevelopmentService _appDevelopmentService;
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
    }

    /// <inheritdoc />
    public async Task<List<RefToOptionListSpecifier>> GetAllOptionListReferences(AltinnRepoEditingContext editingContext, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(editingContext.Org, editingContext.Repo, editingContext.Developer);

        var optionListReferences = await FindOptionListReferencesInLayoutSets(cancellationToken);
        var optionListReferencesWithTaskData = await AddTaskDataToOptionListReferences(editingContext, optionListReferences, cancellationToken);

        return optionListReferencesWithTaskData;
    }

    private async Task<List<RefToOptionListSpecifier>> FindOptionListReferencesInLayoutSets(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string[] layoutSetNames = _altinnAppGitRepository.GetLayoutSetNames();

        return await FindOptionListReferencesInGivenLayoutSets(layoutSetNames, cancellationToken);
    }

    private async Task<List<RefToOptionListSpecifier>> FindOptionListReferencesInGivenLayoutSets(string[] layoutSetNames, CancellationToken cancellationToken = default)
    {
        List<RefToOptionListSpecifier> optionsListReferences = [];
        foreach (string layoutSetName in layoutSetNames)
        {
            optionsListReferences = await FindOptionListReferencesInLayoutSet(layoutSetName, optionsListReferences, cancellationToken);
        }

        return optionsListReferences;
    }

    private async Task<List<RefToOptionListSpecifier>> FindOptionListReferencesInLayoutSet(string layoutSetName, List<RefToOptionListSpecifier> existingReferences, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string[] layoutNames = _altinnAppGitRepository.GetLayoutNames(layoutSetName);

        return await FindOptionListReferencesInGivenLayouts(layoutSetName, layoutNames, existingReferences, cancellationToken);
    }

    private async Task<List<RefToOptionListSpecifier>> FindOptionListReferencesInGivenLayouts(string layoutSetName, string[] layoutNames, List<RefToOptionListSpecifier> existingReferences, CancellationToken cancellationToken = default)
    {
        foreach (string layoutName in layoutNames)
        {
            var layout = await _altinnAppGitRepository.GetLayout(layoutSetName, layoutName, cancellationToken);
            existingReferences = FindOptionListReferencesInLayout(layout, existingReferences, layoutSetName, layoutName);
        }

        return existingReferences;
    }

    /// <summary>
    /// Finds all <see cref="RefToOptionListSpecifier"/> in a given layout.
    /// </summary>
    /// <param name="layout">The layout.</param>
    /// <param name="refToOptionListSpecifiers">A list of occurrences to append any optionListIdRefs in the layout to.</param>
    /// <param name="layoutSetName">The layoutSetName the layout belongs to.</param>
    /// <param name="layoutName">The name of the given layout.</param>
    /// <returns>A list of <see cref="RefToOptionListSpecifier"/>.</returns>
    private List<RefToOptionListSpecifier> FindOptionListReferencesInLayout(JsonNode layout, List<RefToOptionListSpecifier> refToOptionListSpecifiers, string layoutSetName, string layoutName)
    {
        string[] optionListIds = _altinnAppGitRepository.GetOptionsListIds();
        var layoutArray = layout["data"]?["layout"] as JsonArray;
        if (layoutArray == null)
        {
            return refToOptionListSpecifiers;
        }

        foreach (var item in layoutArray)
        {
            string optionListId = item["optionsId"]?.ToString();

            if (!optionListIds.Contains(optionListId))
            {
                continue;
            }

            if (!String.IsNullOrEmpty(optionListId))
            {
                if (OptionListIdAlreadyOccurred(refToOptionListSpecifiers, optionListId, out var existingRef))
                {
                    if (OptionListIdAlreadyOccurredInLayout(existingRef, layoutSetName, layoutName, out var existingSource))
                    {
                        existingSource.ComponentIds.Add(item["id"]?.ToString());
                    }
                    else
                    {
                        AddNewOptionListIdSource(existingRef, layoutSetName, layoutName, item["id"]?.ToString());
                    }
                }
                else
                {
                    AddNewRefToOptionListSpecifier(refToOptionListSpecifiers, optionListId, layoutSetName, layoutName, item["id"]?.ToString());
                }
            }
        }
        return refToOptionListSpecifiers;
    }

    private bool OptionListIdAlreadyOccurred(List<RefToOptionListSpecifier> refToOptionListSpecifiers, string optionListId, out RefToOptionListSpecifier existingRef)
    {
        existingRef = refToOptionListSpecifiers.FirstOrDefault(refToOptionList => refToOptionList.OptionListId == optionListId);
        return existingRef != null;
    }

    private bool OptionListIdAlreadyOccurredInLayout(RefToOptionListSpecifier refToOptionListSpecifier, string layoutSetName, string layoutName, out OptionListIdSource existingSource)
    {
        existingSource = refToOptionListSpecifier.OptionListIdSources.FirstOrDefault(
            optionListIdSource =>
                optionListIdSource.LayoutSetId == layoutSetName
                && optionListIdSource.LayoutName == layoutName
        );
        return existingSource != null;
    }

    private void AddNewOptionListIdSource(RefToOptionListSpecifier refToOptionListSpecifier, string layoutSetName, string layoutName, string componentId)
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

    private void AddNewRefToOptionListSpecifier(List<RefToOptionListSpecifier> refToOptionListSpecifiers, string optionListId, string layoutSetName, string layoutName, string componentId)
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

    public async Task<List<RefToOptionListSpecifier>> AddTaskDataToOptionListReferences(AltinnRepoEditingContext editingContext, List<RefToOptionListSpecifier> optionListReferences, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (optionListReferences.Count == 0)
        {
            return optionListReferences;
        }

        LayoutSetsModel layoutSetsModel = await _appDevelopmentService.GetLayoutSetsExtended(editingContext, cancellationToken);
        if (layoutSetsModel.Sets.Count == 0)
        {
            return optionListReferences;
        }

        AddTaskDataToOptionListReferences(optionListReferences, layoutSetsModel);

        return optionListReferences;
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
