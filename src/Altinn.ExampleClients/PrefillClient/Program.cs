using Altinn.Platform.Storage.Interface.Models;
using System;
using System.IO;
using System.Net.Http;
using System.Linq;
using Newtonsoft.Json;
using System.Collections.Generic;

namespace Altinn.Clients.PrefillClient
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Starting program.");

            Dictionary<string, string> dict = args.Select(a => a.Split('=')).ToDictionary(a => a[0].ToLower().Substring(1), a => a.Length == 2 ? a[1] : null);

            string appId = null;
            string url = null;
            string folder = null;
            
            if (dict.Count() == 0)
            {
                Console.WriteLine("No parameters given, please restart the program including these ('appid' and 'url', optionally 'folder').");
                System.Environment.Exit(0);
            }

            if (dict.ContainsKey("appid") && dict.ContainsKey("url"))
            {
                appId = dict["appid"];
                url = dict["url"];
            }
            else
            {
                Console.WriteLine("Did not find both the required parameters 'appid' and 'url', please restart the program with both given.");
                System.Environment.Exit(0);
            }

            if (dict.ContainsKey("folder"))
            {
                folder = dict["folder"];
            }
            else
            {
                folder = AppDomain.CurrentDomain.BaseDirectory;
                Console.WriteLine($"No folder set, hence the folder containing XML files is presumed to be the folder where the application execute from: {folder}");
            }
            
            string[] xmlFilePaths = Directory.GetFiles(folder, "*.xml");

            if (xmlFilePaths == null || xmlFilePaths.Length < 1)
            {
                Console.WriteLine($"Please add the XML files in the chosen folder ({folder}), and restart the program. " +
                    "Otherwise specify the correct folder which contains the XML files with the '-folder=' command.");
                System.Environment.Exit(0);
            }

            string requestUri = $"{url}?appId={appId}";

            InstanciateAndPrefillData(xmlFilePaths, requestUri, folder);
            
            Console.WriteLine("Program finished executing.");
        }

        private static void InstanciateAndPrefillData(string[] xmlFilePaths, string requestUri, string folder)
        {
            HttpClient client = new HttpClient();

            string xmlFileName, personNumber;

            foreach (string xmlFilePath in xmlFilePaths)
            {
                xmlFileName = xmlFilePath.Split("\\").Last();

                // The person number is the XML filename
                personNumber = xmlFileName.Split(".").First();

                Instance instanceTemplate = new Instance()
                {
                    InstanceOwner = new InstanceOwner { PersonNumber = personNumber}
                };

                MultipartFormDataContent content = new MultipartContentBuilder(instanceTemplate)
                .AddDataElement("default", new FileStream(xmlFilePath, FileMode.Open), "application/xml")
                .Build();

                try
                {
                    HttpResponseMessage response = client.PostAsync(requestUri, content).Result;
                    string result = response.Content.ReadAsStringAsync().Result;

                    if (!response.IsSuccessStatusCode)
                    {
                        File.WriteAllText($"{folder}\\error-{personNumber}.txt", $"Status code '{Convert.ToInt32(response.StatusCode)}', error message: {result}");
                    }
                    else
                    {
                        Instance instanceResult = JsonConvert.DeserializeObject<Instance>(result);
                        File.WriteAllText($"{folder}\\{personNumber}.json", JsonConvert.SerializeObject(instanceResult, Formatting.Indented));
                    }
                }
                catch (Exception e)
                {
                    File.WriteAllText($"{folder}\\error-{personNumber}.txt", $"{e.Message}");
                }
            }
        }
    }
}
