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
    public async Task<List<RefToOptionListSpecifier>> FindOptionListReferencesInLayoutSetsAsync(string org, string repo, string developer, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
        string[] layoutSetNames = altinnAppGitRepository.GetLayoutSetNames();

        return await FindOptionListReferencesInGivenLayoutSetsAsync(org, repo, developer, layoutSetNames, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<List<RefToOptionListSpecifier>> GetAllOptionListReferences(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var optionListReferences = await FindOptionListReferencesInLayoutSetsAsync(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer, cancellationToken);
        var optionListReferencesWithTaskData = await AddTaskDataToOptionListReferences(altinnRepoEditingContext, optionListReferences, cancellationToken);

        return optionListReferencesWithTaskData;
    }

    /// <inheritdoc />
    public async Task<List<RefToOptionListSpecifier>> FindOptionListReferencesInGivenLayoutSetsAsync(string org, string repo, string developer, string[] layoutSetNames, CancellationToken cancellationToken = default)
    {
        List<RefToOptionListSpecifier> optionsListReferences = [];
        foreach (string layoutSetName in layoutSetNames)
        {
            optionsListReferences = await FindOptionListReferencesInLayoutSetAsync(org, repo, developer, layoutSetName, optionsListReferences, cancellationToken);
        }

        return optionsListReferences;
    }

    /// <inheritdoc />
    public async Task<List<RefToOptionListSpecifier>> FindOptionListReferencesInLayoutSetAsync(string org, string repo, string developer, string layoutSetName, List<RefToOptionListSpecifier> existingReferences, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
        string[] layoutNames = altinnAppGitRepository.GetLayoutNames(layoutSetName);

        return await FindOptionListReferencesInGivenLayoutsAsync(org, repo, developer, layoutSetName, layoutNames, existingReferences, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<List<RefToOptionListSpecifier>> FindOptionListReferencesInGivenLayoutsAsync(string org, string repo, string developer, string layoutSetName, string[] layoutNames, List<RefToOptionListSpecifier> existingReferences, CancellationToken cancellationToken = default)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
        foreach (string layoutName in layoutNames)
        {
            var layout = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName, cancellationToken);
            existingReferences = FindOptionListReferencesInLayout(altinnAppGitRepository, layout, existingReferences, layoutSetName, layoutName);
        }

        return existingReferences;
    }

    /// <inheritdoc />
    public List<RefToOptionListSpecifier> FindOptionListReferencesInLayout(AltinnAppGitRepository altinnAppGitRepository, JsonNode layout, List<RefToOptionListSpecifier> existingReferences, string layoutSetName, string layoutName)
    {
        var optionListIds = altinnAppGitRepository.GetOptionsListIds();
        var layoutArray = layout["data"]?["layout"] as JsonArray;
        if (layoutArray == null)
        {
            return existingReferences;
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
                if (OptionListIdAlreadyOccurred(existingReferences, optionListId, out var existingRef))
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
                    AddNewRefToOptionListSpecifier(existingReferences, optionListId, layoutSetName, layoutName, item["id"]?.ToString());
                }
            }
        }
        return existingReferences;
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

    public async Task<List<RefToOptionListSpecifier>> AddTaskDataToOptionListReferences(AltinnRepoEditingContext altinnRepoEditingContext, List<RefToOptionListSpecifier> optionListReferences, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (optionListReferences.Count == 0)
        {
            return optionListReferences;
        }

        LayoutSetsModel layoutSetsModel = await _appDevelopmentService.GetLayoutSetsExtended(altinnRepoEditingContext, cancellationToken);
        if (layoutSetsModel.Sets.Count == 0)
        {
            return optionListReferences;
        }

        AddTaskDataToOptionListReference(optionListReferences, layoutSetsModel);

        return optionListReferences;
    }

    private static void AddTaskDataToOptionListReference(List<RefToOptionListSpecifier> optionListReferences, LayoutSetsModel layoutSetsModel)
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