using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.services.options
{
    public class TestOptionsProvider : IInstanceAppOptionsProvider
    {
        public string Id { get; set; } = "test";

        public Task<AppOptions> GetInstanceAppOptionsAsync(InstanceIdentifier instanceIdentifier, string language, Dictionary<string, string> keyValuePairs)
        {
            string source = keyValuePairs.GetValueOrDefault("source");

            if (string.IsNullOrEmpty(source))
            {
                return Task.FromResult(new AppOptions { Options = new List<AppOption>() });
            }

            string label, value;
            switch (source)
            {
                case "altinn":
                    label = "Ole";
                    value = "1";
                    break;
                case "digdir":
                    label = "Dole";
                    value = "2";
                    break;
                default:
                    label = "Doffen";
                    value = "3";
                    break;
            }

            var options = new AppOptions
            {
                Options = new List<AppOption>
        {
            new AppOption
            {
                Label = label,
                Value = value
            }
        }
            };

            return Task.FromResult(options);
        }
    }
}