using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace App.IntegrationTests.Mocks.Apps.Ttd.AnonymousStateless.Options
{
    public class IndustriesAppOptionsProvider : IAppOptionsProvider
    {
        public string Id => "bransjer";

        public Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            var appOptions = new AppOptions()
            {
                IsCacheable = true,
                Options = new List<AppOption>() 
                {
                    new AppOption() { Value = "A", Label = "Jordbruk, skogbruk og fiske" },
                    new AppOption() { Value = "B", Label = "Bergverksdrift og utvinning" },
                    new AppOption() { Value = "C", Label = "Industri" }
                }
            };

            return Task.FromResult(appOptions);
        }
    }
}
