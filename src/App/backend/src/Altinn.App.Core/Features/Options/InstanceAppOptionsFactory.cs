using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Options;

/// <summary>
/// Factory class for resolving <see cref="IInstanceAppOptionsProvider"/> implementations
/// based on the name/id of the app options requested.
/// </summary>
public class InstanceAppOptionsFactory
{
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="AppOptionsFactory"/> class.
    /// </summary>
    public InstanceAppOptionsFactory(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Finds the implementation of IInstanceAppOptionsProvider based on the options id
    /// provided.
    /// </summary>
    /// <param name="optionsId">Id matching the options requested.</param>
    public IInstanceAppOptionsProvider? GetOptionsProvider(string optionsId)
    {
        var instanceAppOptionsProviders = _appImplementationFactory.GetAll<IInstanceAppOptionsProvider>();
        foreach (var instanceAppOptionProvider in instanceAppOptionsProviders)
        {
            if (!instanceAppOptionProvider.Id.Equals(optionsId, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            return instanceAppOptionProvider;
        }

        return null;
    }
}
