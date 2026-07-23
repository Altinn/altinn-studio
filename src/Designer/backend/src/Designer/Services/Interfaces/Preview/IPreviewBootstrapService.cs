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
/// Assembles the data v9 app-frontend needs to bootstrap in the Studio preview, mirroring the app
/// backend's BootstrapGlobalService and FormBootstrapService.
/// </summary>
public interface IPreviewBootstrapService
{
    /// <summary>
    /// Application metadata with the mocked values the preview needs (mocked Altinn Nuget version and all
    /// partyTypesAllowed set to false to bypass app-frontend's party check).
    /// </summary>
    Task<ApplicationMetadata> GetMockedApplicationMetadata(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The global bootstrap state (window.altinnAppGlobalData) as JSON, serialized as the app backend does.
    /// </summary>
    Task<string> GetAppGlobalDataJson(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The consolidated form bootstrap for a stateful instance (layouts + data models).
    /// </summary>
    Task<JsonObject> GetInstanceFormBootstrap(
        AltinnRepoEditingContext editingContext,
        string uiFolder,
        Instance instance,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The enriched instance (instance with process embedded), with process.processTasks populated from
    /// the app's BPMN so app-frontend sees each task's real type and treats the task ids as valid.
    /// </summary>
    JsonObject GetEnrichedInstance(AltinnRepoEditingContext editingContext, Instance instance);

    /// <summary>A mocked user profile for the preview.</summary>
    UserProfile GetMockUserProfile();

    /// <summary>A mocked party for the preview.</summary>
    Party GetMockParty();
}
