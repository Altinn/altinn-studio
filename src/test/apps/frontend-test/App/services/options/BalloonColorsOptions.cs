using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.services.options
{
    public class BalloonColorsOptions : IAppOptionsProvider
    {
        public string Id => "balloonColors";

        public static List<string> Colors { get;} =
            ["Rød", "Grønn", "Blå", "Gul", "Svart", "Hvit", "Brun", "Oransje", "Lilla", "Rosa"];

        public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            string balloonNum = keyValuePairs.GetValueOrDefault("balloonNum");
            List<AppOption> output = new List<AppOption>();

            for (int i = 0; i < Colors.Count; i++)
            {
                output.Add(new AppOption
                {
                    Label = $"Ballong {balloonNum} er {Colors[i]}",
                    Value = $"{balloonNum}-{i}"
                });
            }


            AppOptions options = new AppOptions
            {
                Options = output
            };

            return await Task.FromResult(options);
        }
    }
}