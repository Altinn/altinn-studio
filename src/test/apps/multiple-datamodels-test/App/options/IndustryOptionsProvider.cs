using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.Options
{
    public class IndustryOptionsProvider : IAppOptionsProvider
    {
        public string Id { get; set; } = "industry";

        public Task<AppOptions> GetAppOptionsAsync(
            string language,
            Dictionary<string, string> keyValuePairs
        )
        {
            keyValuePairs.TryGetValue("sector", out var sector);

            if (sector == "public")
            {
                return Task.FromResult(
                    new AppOptions()
                    {
                        Options = new List<AppOption>
                        {
                            new AppOption { Label = "Statlig", Value = "state", },
                            new AppOption { Label = "Kommunal", Value = "municipality" }
                        }
                    }
                );
            }
            else if (sector == "private")
            {
                return Task.FromResult(
                    new AppOptions()
                    {
                        Options = new List<AppOption>
                        {
                            new AppOption { Label = "Annen industri (kjemi etc.)", Value = "493" },
                            new AppOption { Label = "Bygge- og anleggsvirksomhet", Value = "472" },
                            new AppOption
                            {
                                Label = "Elektronikk og telekommunikasjon",
                                Value = "485"
                            },
                            new AppOption { Label = "Forskning og utvikling", Value = "486" },
                            new AppOption { Label = "IKT (data/IT)", Value = "491" },
                            new AppOption { Label = "Kraft- og vannforsyning", Value = "494" },
                            new AppOption { Label = "Petroleum og engineering", Value = "495" },
                            new AppOption
                            {
                                Label = "Rådgivning/konsulentvirksomhet",
                                Value = "496"
                            },
                            new AppOption { Label = "Verkstedindustri", Value = "445" }
                        }
                    }
                );
            }

            return Task.FromResult(new AppOptions() { Options = new List<AppOption> { } });
        }
    }
}
