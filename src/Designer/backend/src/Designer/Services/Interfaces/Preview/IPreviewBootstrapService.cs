using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;

namespace Altinn.Studio.Designer.Services.Interfaces.Preview;

/// <summary>
/// Assembles the data v9 app-frontend needs to bootstrap and render in the Studio preview,
/// mirroring the app backend's BootstrapGlobalService and FormBootstrapService. The mocked data
/// reuses what the individual preview endpoints already expose; fields without a preview source
/// are provided as safe defaults.
/// </summary>
public interface IPreviewBootstrapService
{
    /// <summary>
    /// Gets the application metadata with the mocked values the preview needs (mocked Altinn Nuget
    /// version and all partyTypesAllowed set to false to bypass the party check in app-frontend).
    /// </summary>
    Task<ApplicationMetadata> GetMockedApplicationMetadata(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Builds the global bootstrap state (window.altinnAppGlobalData) as a JSON string, serialized the
    /// same way the app backend serializes it (camelCase, null values omitted).
    /// </summary>
    Task<string> GetAppGlobalDataJson(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Builds the consolidated form bootstrap for a stateful instance (layouts + data models), mirroring
    /// the app backend's FormBootstrapService.
    /// </summary>
    Task<JsonObject> GetInstanceFormBootstrap(
        AltinnRepoEditingContext editingContext,
        string uiFolder,
        Instance instance,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// A mocked user profile for the preview.
    /// </summary>
    UserProfile GetMockUserProfile();

    /// <summary>
    /// A mocked party for the preview.
    /// </summary>
    Party GetMockParty();
}
