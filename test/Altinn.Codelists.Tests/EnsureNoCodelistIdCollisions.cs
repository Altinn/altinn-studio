using Altinn.App.Core.Features;
using Altinn.Codelists.Extensions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Codelists.Tests;

public class EnsureNoCodelistIdCollisionsTest
{
    [Fact]
    public void EnsureNoCodelistIdCollision()
    {
        IServiceCollection services = new ServiceCollection();
        services.AddAltinnCodelists();
        var serviceProvider = services.BuildServiceProvider();
        var appOptionsProviders = serviceProvider.GetServices<IAppOptionsProvider>().ToList<IAppOptionsProvider>();

        Assert.Empty(ValidateIdsAreUnique(appOptionsProviders));
    }

    public static string ValidateIdsAreUnique<T>(List<T> objects)
        where T : IAppOptionsProvider
    {
        HashSet<string> seenIds = new();

        foreach (T obj in objects)
        {
            if (seenIds.Contains(obj.Id))
            {
                return $"{obj.Id} in {obj.GetType().FullName}";
            }
            seenIds.Add(obj.Id);
        }

        return string.Empty;
    }
}
