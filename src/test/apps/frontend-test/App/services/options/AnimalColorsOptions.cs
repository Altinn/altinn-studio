using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.services.options
{
    public class AnimalColorsOptions : IAppOptionsProvider
    {
        public string Id => "animalColors";

        public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {

            string isForeign = keyValuePairs.GetValueOrDefault("foreign");
            List<AppOption> output = new List<AppOption>();

            if (isForeign == "true")
            {
                output.Add(new AppOption { Value = "BROWN", Label = "Brun" });
                output.Add(new AppOption { Value = "ORANGE", Label = "Oransje" });
            }
            if (isForeign == "false")
            {
                output.Add(new AppOption { Value = "PURPLE", Label = "Lilla" });
                output.Add(new AppOption { Value = "PINK", Label = "Rosa" });
            }

            // Add some base colors that work regardless of the value of isForeign
            output.Add(new AppOption { Value = "RED", Label = "Rød" });
            output.Add(new AppOption { Value = "GREEN", Label = "Grønn" });
            output.Add(new AppOption { Value = "BLUE", Label = "Blå" });
            output.Add(new AppOption { Value = "YELLOW", Label = "Gul" });
            output.Add(new AppOption { Value = "BLACK", Label = "Svart" });
            output.Add(new AppOption { Value = "WHITE", Label = "Hvit" });

            var options = new AppOptions
            {
                Options = output
            };

            return await Task.FromResult(options);
        }
    }
}