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
    /// <param name="frontendVersionOverride">Optional frontend version URL override (only used in development).</param>
    /// <returns>The generated HTML content.</returns>
    Task<string> Generate(
        string org,
        string app,
        BootstrapGlobalResponse appGlobalState,
        string? frontendVersionOverride = null
    );
}
