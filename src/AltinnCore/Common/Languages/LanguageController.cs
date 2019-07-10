using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using AltinnCore.Common.Configuration;
using IniParser;
using IniParser.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// This service will create a language API from ini-files
    /// </summary>
    public class LanguageController : Controller
    {
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="LanguageController"/> class.
        /// </summary>
        /// <param name="generalSettings">The general settings.</param>
        /// <param name="logger">the log handler.</param>
        public LanguageController(
            IOptions<GeneralSettings> generalSettings, ILogger<LanguageController> logger)
        {
            _generalSettings = generalSettings.Value;
            _logger = logger;
        }

        /// <summary>
        /// Reads ini files, converts it to json
        /// </summary>
        /// <param name="languageCode">The current language code</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public IActionResult GetLanguageAsJSON(string languageCode)
        {
            FileIniDataParser parser = new FileIniDataParser();
            Dictionary<string, Dictionary<string, string>> outerDict = new Dictionary<string, Dictionary<string, string>>();
            Dictionary<string, string> objDict = new Dictionary<string, string>();
            string currentDirectory = Directory.GetCurrentDirectory();
            string filePath = string.Empty;

            if (Environment.GetEnvironmentVariable("GeneralSettings__LanguageFilesLocation") != null)
            {
                filePath = Path.Combine(currentDirectory, $"{Environment.GetEnvironmentVariable("GeneralSettings__LanguageFilesLocation")}{languageCode}.ini");
            }
            else
            {
                filePath = Path.Combine(currentDirectory, $"{_generalSettings.LanguageFilesLocation}{languageCode}.ini");
            }

            var watch = System.Diagnostics.Stopwatch.StartNew();
            IniData parsedData = parser.ReadFile(filePath, Encoding.UTF8);
            watch.Stop();
            _logger.Log(Microsoft.Extensions.Logging.LogLevel.Information, "read inifile - {0} ", watch.ElapsedMilliseconds);

            watch = System.Diagnostics.Stopwatch.StartNew();

            // Iterate through all the sections
            foreach (SectionData section in parsedData.Sections)
            {
                // Iterate through all the keys in the current section
                // printing the values
                foreach (KeyData key in section.Keys)
                {
                    objDict.Add(key.KeyName, key.Value);
                }

                outerDict.Add(section.SectionName, objDict);
            }

            watch.Stop();
            _logger.Log(Microsoft.Extensions.Logging.LogLevel.Information, "parse inifile - {0} ", watch.ElapsedMilliseconds);
            string json = Newtonsoft.Json.JsonConvert.SerializeObject(outerDict);

            return Content(json, "application/json", Encoding.UTF8);
        }
    }
}
