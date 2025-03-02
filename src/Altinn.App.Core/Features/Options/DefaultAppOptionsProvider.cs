using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Options;

/// <inheritdoc/>
public class DefaultAppOptionsProvider : IAppOptionsProvider
{
    private readonly IServiceProvider _serviceProvider;
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="DefaultAppOptionsProvider"/> class.
    /// </summary>
    public DefaultAppOptionsProvider(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// This is the default app options implementation and will resolve static
    /// json files in the options folder of the app. As the id is used to resolve
    /// the file name, this particular Id=Default will be replaced run-time by
    /// the <see cref="AppOptionsFactory"/> when providing the class.
    /// </summary>
    public string Id { get; internal set; } = "default";

    /// <inheritdoc/>
    public async Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
    {
        // This will get static options if it exists
        var appOptionsFileHandler = _appImplementationFactory.GetRequired<IAppOptionsFileHandler>();
        var appOptions = new AppOptions { Options = await appOptionsFileHandler.ReadOptionsFromFileAsync(Id) };

        return appOptions;
    }

    /// <summary>
    /// Internal method for cloning the default implementation and setting the id
    /// as the implementation will use the id when finding the configured option files.
    /// </summary>
    /// <param name="cloneToOptionId">The actual option id to use.</param>
    /// <returns></returns>
    internal IAppOptionsProvider CloneDefaultTo(string cloneToOptionId)
    {
        var clone = new DefaultAppOptionsProvider(_serviceProvider) { Id = cloneToOptionId };
        return clone;
    }
}
