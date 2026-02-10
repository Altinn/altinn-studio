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
    /// <param name="layoutSetIdOverride">Optional layout set ID override (for subforms).</param>
    /// <param name="dataElementIdOverride">Optional data element ID override (for subforms).</param>
    /// <param name="isPdf">Whether this is for PDF generation (skips certain data).</param>
    /// <param name="language">Language for text resources.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Complete form bootstrap data.</returns>
    Task<FormBootstrapResponse> GetInstanceFormBootstrap(
        Instance instance,
        string? layoutSetIdOverride,
        string? dataElementIdOverride,
        bool isPdf,
        string language,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Get all data needed to bootstrap a stateless form.
    /// </summary>
    /// <param name="layoutSetId">The layout set ID to use.</param>
    /// <param name="language">Language for text resources.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Complete form bootstrap data.</returns>
    Task<FormBootstrapResponse> GetStatelessFormBootstrap(
        string layoutSetId,
        string language,
        CancellationToken cancellationToken = default
    );
}
