using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace App.IntegrationTests.Mocks.Apps.Ttd.EndringAvNavn.Options
{
    internal class WeekdaysAppOptionsProvider : IAppOptionsProvider
    {
        public string Id => "weekdays";

        public Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            var appOptions = new AppOptions();

            appOptions.Options = new List<AppOption>
            {
                new AppOption() { Value = "1", Label = "Mandag" },
                new AppOption() { Value = "2", Label = "Tirsdag" },
                new AppOption() { Value = "3", Label = "Onsdag" },
                new AppOption() { Value = "4", Label = "Torsdag" },
                new AppOption() { Value = "5", Label = "Fredag" },
                new AppOption() { Value = "6", Label = "Lørdag" },
                new AppOption() { Value = "7", Label = "Søndag" }
            };

            appOptions.IsCacheable = true;

            return Task.FromResult(appOptions);
        }
    }
}
