using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
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
    // This value acts as the mocked party id for the preview user/party.
    private const int PartyId = 51001;

    // Standard platform brand/static-asset URLs (same defaults every app uses, see PlatformFrontendSettings
    // in the app backend). These are CDN-hosted brand assets, distinct from the app-frontend bundle Designer
    // self-hosts. app-frontend fetches the logo SVG from altinnLogoUrl on load, so it must be a real URL.
    private const string AltinnLogoUrl = "https://altinncdn.no/img/Altinn-logo-blue.svg";
    private const string HelpCircleIllustrationUrl = "https://altinncdn.no/img/illustration-help-circle.svg";
    private const string PostalCodesUrl = "https://altinncdn.no/postcodes/registry.json";

    // Matches how the app backend (IndexPageGenerator) serializes the global bootstrap state: camelCase
    // property names and null values omitted. The default (HTML-safe) encoder is kept so the JSON can be
    // embedded directly inside a <script> tag.
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
        // This property is populated at runtime by the apps, so we need to mock it here.
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
        // The app backend defaults OnEntry when it is missing (see AppMetadata.cs). Mirror that here so
        // app-frontend's useIsStateless (which reads onEntry.show) does not crash for apps without one.
        applicationMetadata.OnEntry ??= new Altinn.App.Core.Models.OnEntry { Show = "new-instance" };

        Altinn.Studio.Designer.Models.TextResource? textResources = await TryGetTextResources(
            altinnAppGitRepository,
            cancellationToken
        );
        List<ApplicationLanguage> availableLanguages = GetAvailableLanguages(editingContext);
        // Serve the raw footer JSON so app-frontend gets the authored icon casing (e.g. "information");
        // the typed FooterFile mangles enum values under System.Text.Json.
        JsonNode footer = await altinnAppGitRepository.GetFooterAsJsonNode(cancellationToken);
        JsonObject ui = await BuildUiConfigurationNode(altinnAppGitRepository, cancellationToken);

        var appGlobalData = new
        {
            applicationMetadata,
            textResources,
            availableLanguages,
            ui,
            footer,
            // Provided as defaults for now - app-frontend needs these present to bootstrap, but the
            // preview has no source for them yet (see BootstrapGlobalService for the runtime values).
            frontendSettings = new Dictionary<string, string>(),
            platformFrontendSettings = new
            {
                altinnLogoUrl = AltinnLogoUrl,
                helpCircleIllustrationUrl = HelpCircleIllustrationUrl,
                postalCodesUrl = PostalCodesUrl,
            },
            returnUrl = (string?)null,
            userProfile = GetMockUserProfile(),
            selectedParty = GetMockParty(),
            orgName = (object?)null,
            orgLogoUrl = (string?)null,
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

            string schemaJson = await schemaModelService.GetSchema(
                editingContext,
                $"/App/models/{dataElement.DataType}.schema.json",
                cancellationToken
            );

            dataModels[dataElement.DataType] = new JsonObject
            {
                ["schema"] = JsonNode.Parse(schemaJson),
                // Empty initial data for now - app-frontend fills the form via patches during editing.
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
    /// Builds the UI configuration (window.altinnAppGlobalData.ui) by mirroring the app backend's
    /// AppResourcesSI.GetUiConfiguration: the Settings.json for every layout set folder, keyed by folder
    /// name, plus the global settings from App/ui/Settings.json.
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
    /// Overrides the partyTypesAllowed in app metadata to bypass the check in app-frontend for a valid
    /// party during instantiation.
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
