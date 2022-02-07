using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Configuration;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.PlatformServices.Options
{
    /// <inheritdoc/>
    public class AppOptionsFileHandler : IAppOptionsFileHandler
    {
        private readonly AppSettings _settings;

        /// <summary>
        /// Initializes a new instance of the <see cref="AppOptionsFileHandler"/> class.
        /// </summary>
        public AppOptionsFileHandler(IOptions<AppSettings> settings)
        {
            _settings = settings.Value;
        }

        /// <inheritdoc/>
        public async Task<List<AppOption>> ReadOptionsFromFileAsync(string optionId)
        {
            string legalPath = _settings.AppBasePath + _settings.OptionsFolder;
            string filename = legalPath + optionId + ".json";
            PathHelper.EnsureLegalPath(legalPath, filename);

            if (File.Exists(filename))
            {
                string fileData = await File.ReadAllTextAsync(filename, Encoding.UTF8);
                List<AppOption> options = JsonConvert.DeserializeObject<List<AppOption>>(fileData);
                return options;
            }

            return new List<AppOption>();
        }
    }
}
