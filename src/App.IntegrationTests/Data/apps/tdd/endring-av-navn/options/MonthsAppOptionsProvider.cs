using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace App.IntegrationTests.Mocks.Apps.Ttd.EndringAvNavn.Options
{
    public class MonthsAppOptionsProvider : IAppOptionsProvider
    {
        public string Id => "months";

        public Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            var appOptions = new AppOptions();

            appOptions.Options = new List<AppOption>();

            appOptions.Options.Add(new AppOption() { Value = "1", Label = "Januar" });
            appOptions.Options.Add(new AppOption() { Value = "2", Label = "Februar" });
            appOptions.Options.Add(new AppOption() { Value = "3", Label = "Mars" });
            appOptions.Options.Add(new AppOption() { Value = "4", Label = "April" });
            appOptions.Options.Add(new AppOption() { Value = "5", Label = "Mai" });
            appOptions.Options.Add(new AppOption() { Value = "6", Label = "Juni" });
            appOptions.Options.Add(new AppOption() { Value = "7", Label = "Juli" });
            appOptions.Options.Add(new AppOption() { Value = "8", Label = "August" });
            appOptions.Options.Add(new AppOption() { Value = "9", Label = "September" });
            appOptions.Options.Add(new AppOption() { Value = "10", Label = "Oktober" });
            appOptions.Options.Add(new AppOption() { Value = "11", Label = "November" });
            appOptions.Options.Add(new AppOption() { Value = "12", Label = "Desember" });

            return Task.FromResult(appOptions);
        }
    }
}
