using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Options;

/// <inheritdoc/>
public class DefaultAppOptionsProvider : IAppOptionsProvider
{
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="DefaultAppOptionsProvider"/> class.
    /// The default app options implementation will resolve static
    /// json files in the options folder of the app.
    /// </summary>
    /// <param name="id">
    /// The id/name that is used in the <c>optionsId</c> parameter in the SelectionComponents (Checkboxes, RadioButtons, Dropdown ...)
    /// The id is used to resolve the file name. Should equal the file name without the .json extension.
    /// </param>
    /// <param name="serviceProvider">The service provider used to resolve <see cref="AppImplementationFactory"/></param>
    public DefaultAppOptionsProvider(string id, IServiceProvider serviceProvider)
    {
        Id = id;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// The id/name that is used in the <c>optionsId</c> parameter in the SelectionComponents (Checkboxes, RadioButtons, Dropdown ...)
    /// The id is used to resolve the file name. Should equal the file name without the .json extension.
    /// </summary>
    public string Id { get; private set; }

    /// <inheritdoc/>
    public async Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
    {
        // This will get static options if it exists
        var appOptionsFileHandler = _appImplementationFactory.GetRequired<IAppOptionsFileHandler>();
        var appOptions = new AppOptions { Options = await appOptionsFileHandler.ReadOptionsFromFileAsync(Id) };

        return appOptions;
    }
}
