using System.IO;
using System.Linq;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    public class TextSI : IText
    {
        private readonly AppSettings _settings;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextSI"/> class.
        /// </summary>
        /// <param name="settings">The app repository settings.</param>
        public TextSI(IOptions<AppSettings> settings)
        {
            _settings = settings.Value;
        }

        /// <inheritdoc />
        public TextResource GetText(string org, string app, string language)
        {
            TextResource textResource = null;
            string id = $"resource.{language}.json";

            if (File.Exists(_settings.AppBasePath + _settings.ConfigurationFolder + _settings.TextFolder + id))
            {
                string fileContent = File.ReadAllText(_settings.AppBasePath + _settings.ConfigurationFolder + _settings.TextFolder + id);
                textResource = (TextResource)JsonConvert.DeserializeObject(fileContent, typeof(TextResource));
            }

            if (textResource != null)
            {
                textResource.Id = id;
                textResource.Org = org;
                textResource.Language = language;
            }

            return textResource;
        }
    }
}
