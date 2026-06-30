using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models.Dto;
using Reference = Altinn.Studio.Designer.Models.Reference;

namespace Altinn.Studio.Designer.Helpers;

/// <summary>
/// Shared logic for updating and removing references inside layout sets for both v8 and v9 apps.
/// </summary>
public static class LayoutReferenceUpdateHelper
{
    public static async Task<bool> UpdateReferences(
        AltinnAppGitRepository altinnAppGitRepository,
        List<LayoutSetConfigDto>? layoutSets,
        List<Reference> referencesToUpdate,
        CancellationToken cancellationToken
    )
    {
        List<Reference> referencesToDelete = [];
        bool hasChanges = false;

        var deletedReferences = referencesToUpdate.Where(item => string.IsNullOrEmpty(item.NewId)).ToList();
        var updatedReferences = referencesToUpdate.Where(item => !string.IsNullOrEmpty(item.NewId)).ToList();

        var deletedLayoutsSetIds = deletedReferences
            .Where(item => item.Type == ReferenceType.LayoutSet)
            .Select(item => item.Id)
            .ToList();
        var deletedLayouts = deletedReferences.Where(item => item.Type == ReferenceType.Layout).ToList();
        var deletedComponents = deletedReferences.Where(item => item.Type == ReferenceType.Component).ToList();

        var updatedTasks = updatedReferences.Where(item => item.Type == ReferenceType.Task).ToList();
        var updatedLayoutsSets = updatedReferences.Where(item => item.Type == ReferenceType.LayoutSet).ToList();
        var updatedLayouts = updatedReferences.Where(item => item.Type == ReferenceType.Layout).ToList();
        var updatedComponents = updatedReferences.Where(item => item.Type == ReferenceType.Component).ToList();

        foreach (LayoutSetConfigDto layoutSet in layoutSets ?? [])
        {
            bool isLayoutSetDeleted = deletedLayoutsSetIds.Contains(layoutSet.Id);

            Dictionary<string, JsonNode> layouts = await altinnAppGitRepository.GetFormLayouts(
                layoutSet.Id,
                cancellationToken
            );

            var deletedLayoutIdsFromCurrentLayoutSet = deletedLayouts
                .Where(item => item.LayoutSetName == layoutSet.Id && string.IsNullOrEmpty(item.NewId))
                .Select(item => item.Id)
                .ToList();
            foreach (KeyValuePair<string, JsonNode> layout in layouts)
            {
                bool isLayoutDeleted = deletedLayoutIdsFromCurrentLayoutSet.Contains(layout.Key);
                bool hasLayoutChanges = false;

                // TODO : https://github.com/Altinn/altinn-studio/issues/14073
                if (layout.Value["data"] is not JsonObject data)
                {
                    continue;
                }

                var deletedComponentIdsFromCurrentLayoutSet = deletedComponents
                    .Where(item => item.LayoutSetName == layoutSet.Id && string.IsNullOrEmpty(item.NewId))
                    .Select(item => item.Id)
                    .ToList();
                var updatedComponentsFromCurrentLayoutSet = updatedComponents
                    .Where(item => item.LayoutSetName == layoutSet.Id && !string.IsNullOrEmpty(item.NewId))
                    .ToList();

                if (data["layout"] is JsonArray componentList)
                {
                    for (int i = componentList.Count - 1; i >= 0; i--)
                    {
                        JsonNode? componentNode = componentList[i];
                        if (componentNode is not JsonObject component)
                        {
                            continue;
                        }

                        string? componentId = component["id"]?.GetValue<string>();
                        if (string.IsNullOrEmpty(componentId))
                        {
                            continue;
                        }

                        bool isComponentDeleted = deletedComponentIdsFromCurrentLayoutSet.Contains(componentId);

                        if (isComponentDeleted)
                        {
                            componentList.RemoveAt(i);
                            hasLayoutChanges = true;
                        }
                        else
                        {
                            Reference? updatedReference = updatedComponentsFromCurrentLayoutSet.FirstOrDefault(item =>
                                item.Id == componentId
                            );
                            if (updatedReference != null)
                            {
                                component["id"] = updatedReference.NewId;
                                hasLayoutChanges = true;
                            }
                        }

                        if (isLayoutSetDeleted || isLayoutDeleted || isComponentDeleted)
                        {
                            if (!isComponentDeleted)
                            {
                                referencesToDelete.Add(
                                    new Reference(ReferenceType.Component, layoutSet.Id, componentId)
                                );
                            }

                            continue;
                        }

                        string? componentType = component["type"]?.GetValue<string>();
                        switch (componentType)
                        {
                            case "Subform":
                                string? subformLayoutSet = component["layoutSet"]?.GetValue<string>();
                                if (subformLayoutSet is not null && deletedLayoutsSetIds.Contains(subformLayoutSet))
                                {
                                    referencesToDelete.Add(
                                        new Reference(ReferenceType.Component, layoutSet.Id, componentId)
                                    );
                                    componentList.RemoveAt(i);
                                    hasLayoutChanges = true;
                                }
                                else
                                {
                                    Reference? updatedReference = updatedLayoutsSets.FirstOrDefault(item =>
                                        item.Id == subformLayoutSet
                                    );
                                    if (updatedReference != null)
                                    {
                                        component["layoutSet"] = updatedReference.NewId;
                                        hasLayoutChanges = true;
                                    }
                                }

                                break;
                            case "Summary2":
                                if (component["target"] is JsonObject target)
                                {
                                    string? type = target["type"]?.GetValue<string>();
                                    string? id = target["id"]?.GetValue<string>();
                                    string? taskId = target["taskId"]?.GetValue<string>();
                                    string? layoutSetId = string.IsNullOrEmpty(taskId)
                                        ? layoutSet.Id
                                        : layoutSets?.FirstOrDefault(item => item.TaskId == taskId)?.Id;

                                    if (
                                        (
                                            type == "page"
                                            && deletedLayouts.Exists(item =>
                                                item.LayoutSetName == layoutSetId && item.Id == id
                                            )
                                        )
                                        || (
                                            type == "component"
                                            && deletedComponents.Exists(item =>
                                                item.LayoutSetName == layoutSetId && item.Id == id
                                            )
                                        )
                                        || (layoutSetId is not null && deletedLayoutsSetIds.Contains(layoutSetId))
                                    )
                                    {
                                        referencesToDelete.Add(
                                            new Reference(ReferenceType.Component, layoutSet.Id, componentId)
                                        );
                                        componentList.RemoveAt(i);
                                        hasLayoutChanges = true;
                                    }
                                    else
                                    {
                                        Reference? updatedReference = null;
                                        switch (type)
                                        {
                                            case "page":
                                                updatedReference = updatedLayouts.FirstOrDefault(item =>
                                                    item.LayoutSetName == layoutSetId && item.Id == id
                                                );
                                                break;
                                            case "component":
                                                updatedReference = updatedComponents.FirstOrDefault(item =>
                                                    item.LayoutSetName == layoutSetId && item.Id == id
                                                );
                                                break;
                                        }
                                        if (updatedReference != null)
                                        {
                                            target["id"] = updatedReference.NewId;
                                            hasLayoutChanges = true;
                                        }

                                        if (!string.IsNullOrEmpty(taskId))
                                        {
                                            updatedReference = updatedTasks.FirstOrDefault(item => item.Id == taskId);
                                            if (updatedReference != null)
                                            {
                                                target["taskId"] = updatedReference.NewId;
                                                hasLayoutChanges = true;
                                            }
                                        }
                                    }

                                    if (component["overrides"] is JsonArray overrideList)
                                    {
                                        for (int j = overrideList.Count - 1; j >= 0; j--)
                                        {
                                            JsonNode? overrideItem = overrideList[j];
                                            string? overrideComponentId = overrideItem?[
                                                "componentId"
                                            ]?.GetValue<string>();
                                            if (
                                                deletedComponents.Exists(item =>
                                                    item.LayoutSetName == layoutSetId && item.Id == overrideComponentId
                                                )
                                            )
                                            {
                                                overrideList.RemoveAt(j);
                                                hasLayoutChanges = true;
                                            }
                                            else
                                            {
                                                Reference? updatedReference = updatedComponents.FirstOrDefault(item =>
                                                    item.LayoutSetName == layoutSetId && item.Id == overrideComponentId
                                                );
                                                if (updatedReference != null)
                                                {
                                                    overrideItem!["componentId"] = updatedReference.NewId;
                                                    hasLayoutChanges = true;
                                                }
                                            }

                                            if (overrideList.Count == 0)
                                            {
                                                component.Remove("overrides");
                                            }
                                        }
                                    }
                                }
                                break;
                        }
                    }
                }

                if (isLayoutSetDeleted || isLayoutDeleted)
                {
                    if (!isLayoutDeleted)
                    {
                        referencesToDelete.Add(new Reference(ReferenceType.Layout, layoutSet.Id, layout.Key));
                    }

                    continue;
                }

                if (hasLayoutChanges)
                {
                    await altinnAppGitRepository.SaveLayout(layoutSet.Id, layout.Key, layout.Value, cancellationToken);
                    hasChanges = true;
                }
            }
        }

        if (referencesToDelete.Count > 0)
        {
            hasChanges |= await UpdateReferences(
                altinnAppGitRepository,
                layoutSets,
                referencesToDelete,
                cancellationToken
            );
        }

        return hasChanges;
    }
}
