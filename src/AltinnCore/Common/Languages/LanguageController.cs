using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using IniParser;
using IniParser.Model;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Designer.Controllers
{
    public class LanguageController : Controller
    {
        /// <summary>
        /// Reads ini files, converts it to json
        /// </summary>
        /// <param name="org">The current service owner</param>
        /// <param name="service">The current service</param>
        /// <param name="languageCode">The current language code</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public IActionResult getLanguageAsJSON(string org, string service, string languageCode)
        {
            var parser = new FileIniDataParser();
            string currentDirectory = Directory.GetCurrentDirectory();
            string path = Path.Combine(currentDirectory, $@"..\Common\Languages\ini\{languageCode}.ini");
 
                IniData parsedData = parser.ReadFile(path);

                var obj = new Dictionary<string, Dictionary<string, string>>();

            //Iterate through all the sections
            foreach (SectionData section in parsedData.Sections)
            {
                var objDict = new Dictionary<string, string>();

                //Iterate through all the keys in the current section
                //printing the values
                foreach (KeyData key in section.Keys)
                {
                    objDict.Add(key.KeyName, key.Value);

                }
                obj.Add(section.SectionName, objDict);

            }
            var json = Newtonsoft.Json.JsonConvert.SerializeObject(obj);

            return Content(json, "application/json", Encoding.UTF8);
        }

    }
}
