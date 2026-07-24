using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Preview;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Preview;
using LibGit2Sharp;
using ApplicationLanguage = Altinn.Studio.Designer.Models.ApplicationLanguage;

namespace Altinn.Studio.Designer.Services.Implementation.Preview;

/// <inheritdoc />
public class PreviewBootstrapService(
    IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
    IAppVersionService appVersionService,
    ITextsService textsService,
    ISchemaModelService schemaModelService
) : IPreviewBootstrapService
{
    private const int PartyId = 51001;

    // Platform brand assets fetched by app-frontend on load; altinnLogoUrl must be a reachable URL.
    private const string AltinnLogoUrl = "https://altinncdn.no/img/Altinn-logo-blue.svg";
    private const string HelpCircleIllustrationUrl = "https://altinncdn.no/img/illustration-help-circle.svg";
    private const string PostalCodesUrl = "https://altinncdn.no/postcodes/registry.json";

    // camelCase + null values omitted, matching how the app backend serializes the bootstrap state. The
    // HTML-safe encoder is kept so the JSON can be embedded directly inside a <script> tag.
    private static readonly JsonSerializerOptions s_jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <inheritdoc />
    public async Task<ApplicationMetadata> GetMockedApplicationMetadata(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    )
    {
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext);
        ApplicationMetadata applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata(
            cancellationToken
        );
        string appNugetVersionString = appVersionService.GetAppLibVersion(editingContext).ToString();
        // Populated at runtime by the apps, so mock it here.
        applicationMetadata.AltinnNugetVersion = NugetVersionHelper.GetMockedAltinnNugetBuildFromVersion(
            appNugetVersionString
        );
        SetMockedPartyTypesAllowedAsAllFalse(applicationMetadata);
        return applicationMetadata;
    }

    /// <inheritdoc />
    public async Task<string> GetAppGlobalDataJson(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    )
    {
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext);

        ApplicationMetadata applicationMetadata = await GetMockedApplicationMetadata(editingContext, cancellationToken);
        // Default OnEntry when missing (as the app backend does) so app-frontend's useIsStateless,
        // which reads onEntry.show, does not crash for apps without one.
        applicationMetadata.OnEntry ??= new Altinn.App.Core.Models.OnEntry { Show = "new-instance" };

        Altinn.Studio.Designer.Models.TextResource? textResources = await TryGetTextResources(
            altinnAppGitRepository,
            cancellationToken
        );
        List<ApplicationLanguage> availableLanguages = GetAvailableLanguages(editingContext);
        // Raw footer JSON so app-frontend keeps the authored icon casing; the typed FooterFile mangles
        // enum values under System.Text.Json.
        JsonNode footer = await altinnAppGitRepository.GetFooterAsJsonNode(cancellationToken);
        JsonObject ui = await BuildUiConfigurationNode(altinnAppGitRepository, cancellationToken);

        var appGlobalData = new
        {
            applicationMetadata,
            textResources,
            availableLanguages,
            ui,
            footer,
            // Defaults for now: app-frontend needs these present, but the preview has no source yet.
            frontendSettings = new Dictionary<string, string>(),
            platformFrontendSettings = new
            {
                altinnLogoUrl = AltinnLogoUrl,
                helpCircleIllustrationUrl = HelpCircleIllustrationUrl,
                postalCodesUrl = PostalCodesUrl,
            },
            userProfile = GetMockUserProfile(),
            selectedParty = GetMockParty(),
        };

        return JsonSerializer.Serialize(appGlobalData, s_jsonSerializerOptions);
    }

    /// <inheritdoc />
    public async Task<JsonObject> GetInstanceFormBootstrap(
        AltinnRepoEditingContext editingContext,
        string uiFolder,
        Instance instance,
        CancellationToken cancellationToken = default
    )
    {
        AltinnAppGitRepository altinnAppGitRepository = GetRepository(editingContext);

        Dictionary<string, JsonNode> layouts = await altinnAppGitRepository.GetFormLayouts(uiFolder, cancellationToken);
        ApplicationMetadata applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata(
            cancellationToken
        );

        JsonObject dataModels = new();
        foreach (DataElement dataElement in instance.Data ?? [])
        {
            DataType? dataType = applicationMetadata.DataTypes.Find(dt =>
                dt.Id == dataElement.DataType && dt.AppLogic?.ClassRef is not null
            );
            if (dataType is null)
            {
                continue;
            }

            string schemaJson;
            try
            {
                schemaJson = await schemaModelService.GetSchema(
                    editingContext,
                    $"/App/models/{dataElement.DataType}.schema.json",
                    cancellationToken
                );
            }
            catch (Exception)
            {
                // Schema may not be generated yet for a model just added while editing; skip it rather
                // than failing the whole form bootstrap.
                continue;
            }

            dataModels[dataElement.DataType] = new JsonObject
            {
                ["schema"] = JsonNode.Parse(schemaJson),
                // Empty for now - app-frontend fills the form via patches during editing.
                ["initialData"] = new JsonObject(),
                ["dataElementId"] = dataElement.Id,
            };
        }

        return new JsonObject
        {
            ["layouts"] = JsonSerializer.SerializeToNode(layouts, s_jsonSerializerOptions),
            ["dataModels"] = dataModels,
            ["staticOptions"] = new JsonObject(),
        };
    }

    /// <inheritdoc />
    public JsonObject GetEnrichedInstance(AltinnRepoEditingContext editingContext, Instance instance)
    {
        JsonObject instanceNode = (JsonObject)JsonSerializer.SerializeToNode(instance, s_jsonSerializerOptions)!;

        if (
            instanceNode["process"] is not JsonObject processNode
            || processNode["currentTask"] is not JsonObject currentTaskNode
        )
        {
            return instanceNode;
        }

        // app-frontend derives the task type and validates the task id from process.processTasks. The mock
        // only sets a "data" currentTask, so rebuild processTasks from the app's BPMN process definition
        // to give each task its real type (data/confirmation/feedback/signing/payment).
        List<ProcessTask> processTasks = TryGetProcessTasks(editingContext);
        if (processTasks.Count > 0)
        {
            JsonArray processTasksNode = [];
            foreach (ProcessTask task in processTasks)
            {
                processTasksNode.Add(
                    new JsonObject
                    {
                        ["elementId"] = task.Id,
                        ["altinnTaskType"] = task.ExtensionElements?.TaskExtension?.TaskType,
                    }
                );
            }
            processNode["processTasks"] = processTasksNode;

            string? currentTaskId = currentTaskNode["elementId"]?.GetValue<string>();
            string? currentTaskType = processTasks
                .Find(task => task.Id == currentTaskId)
                ?.ExtensionElements?.TaskExtension?.TaskType;
            if (!string.IsNullOrEmpty(currentTaskType))
            {
                currentTaskNode["altinnTaskType"] = currentTaskType;
            }
        }
        else
        {
            // No process definition available - fall back to marking just the current task valid.
            processNode["processTasks"] = new JsonArray
            {
                new JsonObject
                {
                    ["elementId"] = currentTaskNode["elementId"]?.GetValue<string>(),
                    ["altinnTaskType"] = currentTaskNode["altinnTaskType"]?.GetValue<string>() ?? "data",
                },
            };
        }

        return instanceNode;
    }

    private List<ProcessTask> TryGetProcessTasks(AltinnRepoEditingContext editingContext)
    {
        try
        {
            return GetRepository(editingContext).GetProcessDefinitions()?.Process?.Tasks ?? [];
        }
        catch (Exception)
        {
            // The process is editable in Studio, so a missing or malformed process.bpmn can throw.
            // Degrade to no process tasks so the preview still loads.
            return [];
        }
    }

    /// <inheritdoc />
    public UserProfile GetMockUserProfile()
    {
        // TODO: return actual current testuser when tenor testusers are available
        return new UserProfile
        {
            UserId = 1024,
            UserName = "previewUser",
            PhoneNumber = "12345678",
            Email = "test@test.com",
            PartyId = PartyId,
            Party = new(),
            UserType = 0,
            ProfileSettingPreference = new() { Language = "nb" },
        };
    }

    /// <inheritdoc />
    public Party GetMockParty()
    {
        // TODO: return actual current party when tenor testusers are available
        return new Party
        {
            PartyId = PartyId,
            PartyTypeName = PartyType.Person,
            OrgNumber = "1",
            SSN = null,
            UnitType = "AS",
            Name = "Test Testesen",
            IsDeleted = false,
            OnlyHierarchyElementWithNoAccess = false,
            Person = new Person(),
            Organization = null,
            ChildParties = null,
        };
    }

    /// <summary>
    /// Builds window.altinnAppGlobalData.ui: the Settings.json for every layout set folder (keyed by
    /// folder name) plus the global App/ui/Settings.json.
    /// </summary>
    private async Task<JsonObject> BuildUiConfigurationNode(
        AltinnAppGitRepository altinnAppGitRepository,
        CancellationToken cancellationToken
    )
    {
        JsonObject folders = new();
        IEnumerable<string> uiFolders;
        try
        {
            uiFolders = await altinnAppGitRepository.GetUiFolders(cancellationToken);
        }
        catch (NotFoundException)
        {
            uiFolders = [];
        }

        foreach (string folder in uiFolders)
        {
            JsonNode layoutSettings = await altinnAppGitRepository.GetLayoutSettingsAndCreateNewIfNotFound(
                folder,
                cancellationToken
            );
            PreviewLayoutSettingsHelper.AddPdfLayoutNameToPageOrder(layoutSettings);
            folders[folder] = layoutSettings;
        }

        UiSettings globalSettings = await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken);
        JsonNode? settingsNode = globalSettings is null
            ? null
            : JsonSerializer.SerializeToNode(globalSettings, s_jsonSerializerOptions);

        return new JsonObject { ["folders"] = folders, ["settings"] = settingsNode };
    }

    private static async Task<Altinn.Studio.Designer.Models.TextResource?> TryGetTextResources(
        AltinnAppGitRepository altinnAppGitRepository,
        CancellationToken cancellationToken
    )
    {
        try
        {
            return await altinnAppGitRepository.GetText("nb", cancellationToken);
        }
        catch (FileNotFoundException)
        {
            return null;
        }
    }

    private List<ApplicationLanguage> GetAvailableLanguages(AltinnRepoEditingContext editingContext)
    {
        try
        {
            return textsService
                .GetLanguages(editingContext.Org, editingContext.Repo, editingContext.Developer)
                .Select(language => new ApplicationLanguage { Language = language })
                .ToList();
        }
        catch (NotFoundException)
        {
            return [];
        }
    }

    /// <summary>
    /// Sets all partyTypesAllowed to false to bypass app-frontend's valid-party check during instantiation.
    /// </summary>
    private static void SetMockedPartyTypesAllowedAsAllFalse(ApplicationMetadata applicationMetadata)
    {
        applicationMetadata.PartyTypesAllowed.Person = false;
        applicationMetadata.PartyTypesAllowed.Organisation = false;
        applicationMetadata.PartyTypesAllowed.SubUnit = false;
        applicationMetadata.PartyTypesAllowed.BankruptcyEstate = false;
    }

    private AltinnAppGitRepository GetRepository(AltinnRepoEditingContext editingContext) =>
        altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            editingContext.Org,
            editingContext.Repo,
            editingContext.Developer
        );
}
