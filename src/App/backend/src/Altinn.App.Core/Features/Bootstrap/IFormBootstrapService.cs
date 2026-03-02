using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Bootstrap;

/// <summary>
/// Service for bootstrapping form data by aggregating layouts, data models, options, and validation.
/// </summary>
public interface IFormBootstrapService
{
    /// <summary>
    /// Get all data needed to bootstrap an instance-based form.
    /// </summary>
    /// <param name="instance">The instance to bootstrap.</param>
    /// <param name="uiFolder">Which UI folder to load (usually the task ID, CustomReceipt, or subform name).</param>
    /// <param name="dataElementIdOverride">Optional data element ID override (for subforms).</param>
    /// <param name="isPdf">Whether this is for PDF generation (skips certain data).</param>
    /// <param name="language">Language for text resources.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Complete form bootstrap data.</returns>
    Task<FormBootstrapResponse> GetInstanceFormBootstrap(
        Instance instance,
        string uiFolder,
        string? dataElementIdOverride,
        bool isPdf,
        string language,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Get all data needed to bootstrap a stateless form.
    /// </summary>
    /// <param name="uiFolder">The UI subfolder to use.</param>
    /// <param name="language">Language for text resources.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Complete form bootstrap data.</returns>
    Task<FormBootstrapResponse> GetStatelessFormBootstrap(
        string uiFolder,
        string language,
        CancellationToken cancellationToken = default
    );
}
