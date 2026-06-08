using Altinn.App.Core.Features.Bootstrap.Models;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Service for generating the index page HTML for Altinn apps.
/// </summary>
internal interface IIndexPageGenerator
{
    /// <summary>
    /// Gets whether a legacy Index.cshtml file exists in the app.
    /// When true, the controller should render the Razor view instead of generating HTML.
    /// </summary>
    bool HasLegacyIndexCshtml { get; }

    /// <summary>
    /// Generates the HTML content for the index page.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <param name="app">The application identifier.</param>
    /// <param name="appGlobalState">The bootstrap global state for the app.</param>
    /// <param name="appFrontendAssetBaseUrlOverride">Optional app frontend asset base URL override (only used in development).</param>
    /// <param name="isDevelopment">Whether the app is running in a development environment. When true and no override is supplied, an instructional page is returned instead of serving a bundled frontend.</param>
    /// <returns>The generated HTML content.</returns>
    Task<string> Generate(
        string org,
        string app,
        BootstrapGlobalResponse appGlobalState,
        string? appFrontendAssetBaseUrlOverride = null,
        bool isDevelopment = false
    );
}
