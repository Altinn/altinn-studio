using System;
using System.IO;
using System.Threading.Tasks;

using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

using Newtonsoft.Json;

namespace App.IntegrationTestsRef.Mocks.Services
{
    public class TextMockSI : IText
    {
        public Task<TextResource> GetText(string org, string app, string language)
        {
            TextResource textResource = null;
            string path = GetTextPath(org, app, language);

            if (File.Exists(path))
            {
                string fileContent = File.ReadAllText(path);
                textResource = (TextResource)JsonConvert.DeserializeObject(fileContent, typeof(TextResource));
                textResource.Id = $"{org}-{app}-{language}";
                textResource.Org = org;
                textResource.Language = language;
            }

            return Task.FromResult(textResource);
        }

        private string GetTextPath(string org, string app, string language)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(TextMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\apps\", org + @"\", app + @$"\config\texts\resource.{language}.json");
        }
    }
}
