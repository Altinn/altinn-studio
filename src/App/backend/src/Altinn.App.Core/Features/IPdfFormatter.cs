using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Interface to customize PDF formatting.
/// </summary>
/// <remarks>
/// This interface has been changed and both methods now has default implementation for backwards compatibility.
/// All users will call the method with the Instance parameter, and a user only needs to implement one
/// </remarks>
[Obsolete(
    "This interface was used for the old PDF generator, and is used for backwards compatibility in the chromium based one. It will be removed in the future. Create a custom pdf layout instead if you need to customize the PDF layout."
)]
public interface IPdfFormatter
{
    /// <summary>
    /// Old method to format the PDF dynamically (without Instance)
    /// </summary>
    Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
    {
        throw new NotImplementedException();
    }

    /// <summary>
    /// Method to format the PDF dynamically (new version with the instance)
    /// </summary>
    async Task<LayoutSettings> FormatPdf(
        LayoutSettings layoutSettings,
        object data,
        Instance instance,
        LayoutSet? layoutSet
    )
    {
        return await FormatPdf(layoutSettings, data);
    }
}
