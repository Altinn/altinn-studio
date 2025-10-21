using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.services.options
{
    /// <inheritdoc/>
    public class ReferenceOptions : IAppOptionsProvider
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ReferenceOptions"/> class.
        /// </summary>
        public ReferenceOptions()
        {
        }

        /// <summary>
        /// This is the default app options implementation and will resolve static
        /// json files in the options folder of the app. As the id is used to resolve
        /// the file name, this particular Id=Default will be replaced run-time by
        /// the <see cref="AppOptionsFactory"/> when providing the class.
        /// </summary>
        public string Id { get; internal set; } = "references";

        /// <inheritdoc/>
        public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {

            string source = keyValuePairs.GetValueOrDefault("source");

            if (string.IsNullOrEmpty(source))
            {
                return await Task.FromResult(new AppOptions { Options = new List<AppOption>() });
            }

            string label, value;
            switch (source)
            {
                case "altinn":
                    label = "Ola Nordmann";
                    value = "nordmann";
                    break;
                case "digdir":
                    label = "Sophie Salt";
                    value = "salt";
                    break;
                default:
                    label = "Test";
                    value = "test";
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

            return await Task.FromResult(options);
        }
    }
}