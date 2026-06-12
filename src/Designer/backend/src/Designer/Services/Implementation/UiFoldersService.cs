using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Mappers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

public class UiFoldersService : IUiFoldersService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IProcessModelingService _processModelingService;
    private readonly IPublisher _publisher;
    private readonly ILogger<UiFoldersService> _logger;
    private const string LayoutSetNameRegEx = @"^[a-zA-Z0-9_\-]{2,28}$";

    public UiFoldersService(
        IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IProcessModelingService processModelingService,
        IPublisher publisher,
        ILogger<UiFoldersService> logger
    )
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _processModelingService = processModelingService;
        _publisher = publisher;
        _logger = logger;
    }

    private AltinnAppGitRepository GetRepository(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        return _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            editingContext.Org,
            editingContext.Repo,
            editingContext.Developer
        );
    }

    private static bool ProcessHasTask(Definitions definitions, string taskId) =>
        definitions.Process.Tasks.Any(task => task.Id == taskId);

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
    /// Validates that a layout set name is safe to use. A layout set name becomes a folder name and thus a
    /// path segment, so anything containing path separators or traversal sequences must be rejected before
    /// it reaches a file operation or a log entry. Every endpoint that accepts a layout set name from the
    /// caller must validate it through this method.
    /// </summary>
    private static void ValidateLayoutSetName(string layoutSetName)
    {
        if (string.IsNullOrEmpty(layoutSetName) || !Regex.IsMatch(layoutSetName, LayoutSetNameRegEx))
        {
            throw new InvalidLayoutSetIdException("Layout set name is not valid.");
        }
    }

    private static void ValidateLayoutSetNames(IEnumerable<string> layoutSetNames)
    {
        foreach (string layoutSetName in layoutSetNames)
        {
            ValidateLayoutSetName(layoutSetName);
        }
    }

    private static async Task ValidateNewLayoutSetName(
        AltinnAppGitRepository altinnAppGitRepository,
        string layoutSetName,
        CancellationToken cancellationToken
    )
    {
        ValidateLayoutSetName(layoutSetName);

        IEnumerable<string> existingLayoutSets = await altinnAppGitRepository.GetUiFolders(cancellationToken);
        if (existingLayoutSets.Contains(layoutSetName))
        {
            throw new NonUniqueLayoutSetIdException($"Layout set name, {layoutSetName}, already exists.");
        }
    }

    public async Task<IEnumerable<LayoutSetDto>> AddLayoutSet(
        AltinnRepoEditingContext editingContext,
        LayoutSetConfig newLayoutSet,
        TaskType? taskType,
        CancellationToken cancellationToken
    )
    {
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext, cancellationToken);

        await ValidateNewLayoutSetName(altinnAppGitRepository, newLayoutSet.Id, cancellationToken);

        try
        {
            await CreateLayoutSetFiles(altinnAppGitRepository, newLayoutSet, taskType);
        }
        catch
        {
            // Roll back any partially written files so a failed create does not leave a half-created layout set.
            altinnAppGitRepository.DeleteLayoutSetFolder(newLayoutSet.Id, CancellationToken.None);
            throw;
        }

        await _publisher.Publish(
            new LayoutSetCreatedEvent { EditingContext = editingContext, LayoutSet = newLayoutSet },
            cancellationToken
        );

        return await GetLayoutSets(editingContext, cancellationToken);
    }

    public async Task<IEnumerable<LayoutSetDto>> UpdateLayoutSetName(
        AltinnRepoEditingContext editingContext,
        string oldLayoutSetName,
        string newLayoutSetName,
        CancellationToken cancellationToken
    )
    {
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext, cancellationToken);

        ValidateLayoutSetName(oldLayoutSetName);
        await ValidateNewLayoutSetName(altinnAppGitRepository, newLayoutSetName, cancellationToken);

        // In v9 a non-subform layout set's folder name equals its process task id, so renaming such a
        // layout set must also rename the corresponding task in the process definition.
        Definitions definitions = altinnAppGitRepository.GetProcessDefinitions();
        bool isTaskConnected = ProcessHasTask(definitions, oldLayoutSetName);

        altinnAppGitRepository.ChangeLayoutSetFolderName(oldLayoutSetName, newLayoutSetName, cancellationToken);

        if (isTaskConnected)
        {
            try
            {
                await _processModelingService.UpdateTaskId(
                    editingContext,
                    oldLayoutSetName,
                    newLayoutSetName,
                    cancellationToken
                );
            }
            catch
            {
                // Roll back the folder rename so the repository is not left with the folder name and task id out of sync.
                altinnAppGitRepository.ChangeLayoutSetFolderName(
                    newLayoutSetName,
                    oldLayoutSetName,
                    CancellationToken.None
                );
                throw;
            }
        }

        await _publisher.Publish(
            new LayoutSetIdChangedEvent
            {
                EditingContext = editingContext,
                LayoutSetName = oldLayoutSetName,
                NewLayoutSetName = newLayoutSetName,
            },
            cancellationToken
        );

        if (isTaskConnected)
        {
            await _publisher.Publish(
                new ProcessTaskIdChangedEvent
                {
                    EditingContext = editingContext,
                    OldId = oldLayoutSetName,
                    NewId = newLayoutSetName,
                },
                cancellationToken
            );
        }

        return await GetLayoutSets(editingContext, cancellationToken);
    }

    public async Task<IEnumerable<LayoutSetDto>> DeleteLayoutSet(
        AltinnRepoEditingContext editingContext,
        string layoutSetToDeleteId,
        CancellationToken cancellationToken
    )
    {
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext, cancellationToken);

        ValidateLayoutSetName(layoutSetToDeleteId);

        string? dataType = (
            await TryGetLayoutSettings(altinnAppGitRepository, layoutSetToDeleteId, cancellationToken)
        )?.DataType;
        if (!string.IsNullOrEmpty(dataType))
        {
            await DeleteTaskRefInApplicationMetadata(altinnAppGitRepository, dataType);
        }

        altinnAppGitRepository.DeleteLayoutSetFolder(layoutSetToDeleteId, cancellationToken);

        // Only publish once every repository mutation has succeeded.
        await _publisher.Publish(
            new LayoutSetDeletedEvent { EditingContext = editingContext, LayoutSetName = layoutSetToDeleteId },
            cancellationToken
        );

        return await GetLayoutSets(editingContext, cancellationToken);
    }

    private async Task<LayoutSettings?> TryGetLayoutSettings(
        AltinnAppGitRepository altinnAppGitRepository,
        string layoutSetName,
        CancellationToken cancellationToken
    )
    {
        try
        {
            return await altinnAppGitRepository.GetLayoutSettings(layoutSetName, cancellationToken);
        }
        catch (Exception e) when (e is FileNotFoundException or JsonException)
        {
            _logger.LogWarning(
                e,
                "Could not read Settings.json for layout set {LayoutSetName}. Skipping.",
                SanitizeForLog(layoutSetName)
            );
            return null;
        }
    }

    private static string SanitizeForLog(string input)
    {
        return input.Replace('\r', ' ').Replace('\n', ' ');
    }

    private static async Task DeleteTaskRefInApplicationMetadata(
        AltinnAppGitRepository altinnAppGitRepository,
        string dataTypeId
    )
    {
        ApplicationMetadata applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
        DataType? dataType = applicationMetadata.DataTypes.Find(type => type.Id == dataTypeId);
        if (dataType == null)
        {
            return;
        }

        dataType.TaskId = null;
        await altinnAppGitRepository.SaveApplicationMetadata(applicationMetadata);
    }

    /// <summary>
    /// Creates the initial layout and Settings.json files for a new layout set. Since v9 apps have no
    /// layout-sets.json, the set's <c>type</c> (e.g. subform) and <c>defaultDataType</c> are persisted
    /// directly into the set's Settings.json. Payment and PDF tasks get tailored initial content.
    /// </summary>
    private static async Task CreateLayoutSetFiles(
        AltinnAppGitRepository altinnAppGitRepository,
        LayoutSetConfig newLayoutSet,
        TaskType? taskType
    )
    {
        if (taskType == TaskType.Pdf)
        {
            await CreatePdfLayoutSetFiles(altinnAppGitRepository, newLayoutSet);
            return;
        }

        JsonNode initialLayout = altinnAppGitRepository.InitialLayout;
        if (taskType == TaskType.Payment)
        {
            AddPaymentComponentToInitialLayout(initialLayout);
        }

        await altinnAppGitRepository.SaveLayout(
            newLayoutSet.Id,
            AltinnAppGitRepository.InitialLayoutFileName,
            initialLayout
        );
        await altinnAppGitRepository.SaveLayoutSettings(
            newLayoutSet.Id,
            BuildLayoutSettings(altinnAppGitRepository, newLayoutSet)
        );
    }

    private static JsonObject BuildLayoutSettings(
        AltinnAppGitRepository altinnAppGitRepository,
        LayoutSetConfig layoutSet
    )
    {
        JsonObject settings = new()
        {
            ["$schema"] = altinnAppGitRepository.InitialLayoutSettings["$schema"]!.GetValue<string>(),
            ["pages"] = new JsonObject { ["order"] = new JsonArray([AltinnAppGitRepository.InitialLayoutFileName]) },
        };
        ApplyLayoutSetMetadata(settings, layoutSet);
        return settings;
    }

    private static void ApplyLayoutSetMetadata(JsonObject settings, LayoutSetConfig layoutSet)
    {
        if (!string.IsNullOrEmpty(layoutSet.Type))
        {
            settings["type"] = layoutSet.Type;
        }
        if (!string.IsNullOrEmpty(layoutSet.DataType))
        {
            settings["defaultDataType"] = layoutSet.DataType;
        }
    }

    private static void AddPaymentComponentToInitialLayout(JsonNode layout)
    {
        if (layout["data"]?["layout"] is JsonArray layoutArray)
        {
            layoutArray.Add(
                new JsonObject
                {
                    ["id"] = "PaymentComponentId",
                    ["type"] = "Payment",
                    ["renderAsSummary"] = true,
                }
            );
        }
    }

    private static async Task CreatePdfLayoutSetFiles(
        AltinnAppGitRepository altinnAppGitRepository,
        LayoutSetConfig layoutSet
    )
    {
        const string PdfLayoutFilename = "PdfLayout";
        const string ErrorLayoutFilename = "ServiceTask";
        string layoutSchema = altinnAppGitRepository.InitialLayout["$schema"]!.GetValue<string>();

        await altinnAppGitRepository.SaveLayout(
            layoutSet.Id,
            PdfLayoutFilename,
            new JsonObject
            {
                ["$schema"] = layoutSchema,
                ["data"] = new JsonObject { ["layout"] = new JsonArray([]) },
            }
        );

        await altinnAppGitRepository.SaveLayout(
            layoutSet.Id,
            ErrorLayoutFilename,
            new JsonObject
            {
                ["$schema"] = layoutSchema,
                ["data"] = new JsonObject
                {
                    ["layout"] = new JsonArray([
                        new JsonObject
                        {
                            ["size"] = "L",
                            ["id"] = "service-task-title",
                            ["type"] = "Header",
                            ["textResourceBindings"] = new JsonObject
                            {
                                ["title"] = "service_task_custom_pdf_default.title",
                            },
                        },
                        new JsonObject
                        {
                            ["id"] = "service-task-body",
                            ["type"] = "Paragraph",
                            ["textResourceBindings"] = new JsonObject
                            {
                                ["title"] = "service_task_custom_pdf_default.body",
                            },
                        },
                        new JsonObject
                        {
                            ["id"] = "service-task-help-text",
                            ["type"] = "Paragraph",
                            ["textResourceBindings"] = new JsonObject
                            {
                                ["title"] = "service_task_custom_pdf_default.help_text",
                            },
                        },
                        new JsonObject
                        {
                            ["id"] = "service-task-button-group",
                            ["type"] = "ButtonGroup",
                            ["children"] = new JsonArray("service-task-retry-button", "service-task-back-button"),
                        },
                        new JsonObject
                        {
                            ["id"] = "service-task-retry-button",
                            ["type"] = "Button",
                            ["textResourceBindings"] = new JsonObject
                            {
                                ["title"] = "service_task_custom_pdf_default.retry_button",
                            },
                        },
                        new JsonObject
                        {
                            ["id"] = "service-task-back-button",
                            ["type"] = "ActionButton",
                            ["textResourceBindings"] = new JsonObject
                            {
                                ["title"] = "service_task_custom_pdf_default.back_button",
                            },
                            ["action"] = "reject",
                            ["buttonStyle"] = "secondary",
                        },
                    ]),
                },
            }
        );

        JsonObject settings = new()
        {
            ["$schema"] = altinnAppGitRepository.InitialLayoutSettings["$schema"]!.GetValue<string>(),
            ["pages"] = new JsonObject
            {
                ["pdfLayoutName"] = PdfLayoutFilename,
                ["order"] = new JsonArray([ErrorLayoutFilename]),
            },
        };
        ApplyLayoutSetMetadata(settings, layoutSet);
        await altinnAppGitRepository.SaveLayoutSettings(layoutSet.Id, settings);
    }

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
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext, cancellationToken);

        IEnumerable<string> uiFolders = await altinnAppGitRepository.GetUiFolders(cancellationToken);
        Definitions definitions = altinnAppGitRepository.GetProcessDefinitions();

        List<LayoutSetInfo> layoutSets = [];

        foreach (string layoutSetName in uiFolders)
        {
            LayoutSettings? layoutSettings = await TryGetLayoutSettings(
                altinnAppGitRepository,
                layoutSetName,
                cancellationToken
            );

            if (layoutSettings is null)
            {
                continue;
            }

            bool isSubform = layoutSettings.Type == "subform";
            bool hasMatchingTask = definitions.Process.Tasks.Any(task => task.Id == layoutSetName);

            if (!isSubform && !hasMatchingTask)
            {
                continue;
            }

            string? taskType = hasMatchingTask ? TaskTypeFromDefinitions(definitions, layoutSetName) : null;

            layoutSets.Add(new LayoutSetInfo(layoutSetName, layoutSettings, taskType));
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
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext, cancellationToken);

        UiSettings globalSettingsFile = await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken);
        return globalSettingsFile?.ValidationOnNavigation;
    }

    public Task SaveValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        ValidationOnNavigationConfigDto config,
        CancellationToken cancellationToken
    )
    {
        ValidationOnNavigation validation = new() { Page = config.Page, Show = config.Show };
        return ApplyValidationOnNavigation(editingContext, config, validation, cancellationToken);
    }

    public Task DeleteValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        ValidationOnNavigationConfigDto config,
        CancellationToken cancellationToken
    )
    {
        return ApplyValidationOnNavigation(editingContext, config, null, cancellationToken);
    }

    private async Task ApplyValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        ValidationOnNavigationConfigDto target,
        ValidationOnNavigation? config,
        CancellationToken cancellationToken
    )
    {
        if (target.Task != null && target.Pages is { Count: > 0 })
        {
            await SavePagesValidationOnNavigation(editingContext, target.Task, target.Pages, config, cancellationToken);
        }
        else if (target.Tasks is { Count: > 0 })
        {
            await SaveLayoutSetsValidationOnNavigation(editingContext, target.Tasks, config, cancellationToken);
        }
        else
        {
            await SaveGlobalValidationOnNavigation(editingContext, config, cancellationToken);
        }
    }

    private async Task SaveGlobalValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        ValidationOnNavigation? config,
        CancellationToken cancellationToken
    )
    {
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext, cancellationToken);

        UiSettings globalSettingsFile =
            await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken) ?? new UiSettings();

        globalSettingsFile.ValidationOnNavigation = config;
        await altinnAppGitRepository.SaveGlobalSettingsFile(globalSettingsFile);
    }

    public async Task<IEnumerable<ValidationOnNavigationDto>> GetLayoutSetsValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        List<LayoutSetInfo> layoutSetInfos = await GetLayoutSetInfos(editingContext, cancellationToken);

        // Layout sets that share the same validation config are grouped into a single entry, with the
        // sharing layout set ids listed under Tasks.
        return
        [
            .. layoutSetInfos
                .Where(info => info.LayoutSettings.Pages?.ValidationOnNavigation != null)
                .Select(info => new
                {
                    info.LayoutSetName,
                    info.LayoutSettings.Pages!.ValidationOnNavigation!.Show,
                    info.LayoutSettings.Pages.ValidationOnNavigation.Page,
                })
                .GroupBy(item => new
                {
                    ShowKey = item.Show != null ? string.Join(",", item.Show.OrderBy(s => s)) : string.Empty,
                    item.Page,
                })
                .Select(group => new ValidationOnNavigationDto
                {
                    Tasks = [.. group.Select(item => item.LayoutSetName)],
                    Show = group.First().Show!,
                    Page = group.First().Page!,
                }),
        ];
    }

    private async Task SaveLayoutSetsValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        IEnumerable<string> layoutSetIds,
        ValidationOnNavigation? config,
        CancellationToken cancellationToken
    )
    {
        AltinnAppGitRepository repository = GetRepository(editingContext, cancellationToken);
        ValidateLayoutSetNames(layoutSetIds);
        foreach (string layoutSetId in layoutSetIds)
        {
            LayoutSettings layoutSettings = await repository.GetLayoutSettings(layoutSetId, cancellationToken);
            layoutSettings.Pages ??= new Pages();
            layoutSettings.Pages.ValidationOnNavigation = config;
            await repository.SaveLayoutSettings(layoutSetId, layoutSettings);
        }
    }

    public async Task<IEnumerable<PageValidationOnNavigationDto>> GetPagesValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        AltinnAppGitRepository repository = GetRepository(editingContext, cancellationToken);
        List<LayoutSetInfo> layoutSetInfos = await GetLayoutSetInfos(editingContext, cancellationToken);

        List<PageValidationOnNavigationDto> result = [];
        foreach (LayoutSetInfo layoutSetInfo in layoutSetInfos)
        {
            List<(string PageName, ValidationOnNavigation? Nav)> pageValidations = [];
            foreach (string pageId in repository.GetLayoutNames(layoutSetInfo.LayoutSetName))
            {
                try
                {
                    JsonNode layout = await repository.GetLayout(
                        layoutSetInfo.LayoutSetName,
                        pageId,
                        cancellationToken
                    );
                    JsonNode? validationNode = layout["data"]?["validationOnNavigation"];
                    if (validationNode == null)
                    {
                        continue;
                    }
                    pageValidations.Add((pageId, validationNode.Deserialize<ValidationOnNavigation>()));
                }
                catch (Exception e) when (e is FileNotFoundException or JsonException)
                {
                    _logger.LogWarning(
                        e,
                        "Could not read layout file for page {PageId} in layout set {LayoutSetId}. Skipping.",
                        SanitizeForLog(pageId),
                        SanitizeForLog(layoutSetInfo.LayoutSetName)
                    );
                }
            }

            // Within a layout set, pages that share the same validation config are grouped into a single
            // entry, with the sharing page names listed under Pages.
            result.AddRange(
                pageValidations
                    .GroupBy(item => new
                    {
                        Page = item.Nav!.Page ?? string.Empty,
                        ShowKey = item.Nav.Show != null
                            ? string.Join(",", item.Nav.Show.OrderBy(s => s))
                            : string.Empty,
                    })
                    .Select(group => new PageValidationOnNavigationDto
                    {
                        Task = layoutSetInfo.LayoutSetName,
                        Pages = [.. group.Select(item => item.PageName)],
                        Page = group.First().Nav!.Page!,
                        Show = [.. group.First().Nav!.Show!.OrderBy(s => s)],
                    })
            );
        }
        return result;
    }

    private async Task SavePagesValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        string layoutSetId,
        IEnumerable<string> pageIds,
        ValidationOnNavigation? config,
        CancellationToken cancellationToken
    )
    {
        AltinnAppGitRepository repository = GetRepository(editingContext, cancellationToken);
        ValidateLayoutSetName(layoutSetId);
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
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext, cancellationToken);

        UiSettings globalSettingsFile = await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken);
        return globalSettingsFile?.TaskNavigation?.ToList() ?? [];
    }

    public IEnumerable<ProcessTask> GetTasks(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext, cancellationToken);

        Definitions definitions = altinnAppGitRepository.GetProcessDefinitions();
        return definitions.Process.Tasks;
    }

    public async Task UpdateGlobalTaskNavigation(
        AltinnRepoEditingContext editingContext,
        IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList,
        CancellationToken cancellationToken
    )
    {
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext, cancellationToken);

        IEnumerable<TaskNavigationGroup> taskNavigationGroupList = taskNavigationGroupDtoList.Select(x => x.ToDomain());

        UiSettings globalSettingsFile =
            await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken) ?? new UiSettings();

        globalSettingsFile.TaskNavigation = taskNavigationGroupList.Any() ? taskNavigationGroupList : null;

        await altinnAppGitRepository.SaveGlobalSettingsFile(globalSettingsFile);
    }
}
