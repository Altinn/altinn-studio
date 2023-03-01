using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Codelists.Extensions;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Codelists.Tests
{
    public class EnsureNoCodelistIdCollisionsTest
    {
        [Fact]
        public void EnsureNoCodelistIdCollision()
        {
            IServiceCollection services = new ServiceCollection();
            services.AddAltinnCodelists();
            var serviceProvider = services.BuildServiceProvider();
            var appOptionsProviders = serviceProvider.GetServices<IAppOptionsProvider>().ToList<IAppOptionsProvider>();

            ValidateIdsAreUnique(appOptionsProviders).Should().BeTrue(because: "there should be no codelist with the same id registered");
        }

        public static bool ValidateIdsAreUnique<T>(List<T> objects) where T : IAppOptionsProvider
        {
            HashSet<string> seenIds = new();

            foreach (T obj in objects)
            {
                if (seenIds.Contains(obj.Id))
                {
                    return false;
                }
                seenIds.Add(obj.Id);
            }

            return true;
        }
    }
}
