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
    async Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data, Instance instance, LayoutSet? layoutSet)
    {
        return await FormatPdf(layoutSettings, data);
    }
}
