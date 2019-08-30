using Altinn.Platform.Storage.Models;
using System;
using System.IO;
using System.Net.Http;
using System.Linq;
using Newtonsoft.Json;
using System.Text.RegularExpressions;
using System.Collections.Generic;

namespace Altinn.Clients.PrefillClient
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Starting program.");
            CommandLineArgs commandLineArgs = new CommandLineArgs();

            string appId = null;
            string url = null;
            string folder = null;

            if (commandLineArgs.Count() == 0)
            {
                Console.WriteLine("No parameters given, please restart the program including these.");
                System.Environment.Exit(0);
            }

            if (commandLineArgs.ContainsKey("appid") && commandLineArgs.ContainsKey("url"))
            {
                appId = commandLineArgs["appid"];
                url = commandLineArgs["url"];
            }
            else
            {
                Console.WriteLine("Did not find both the required parameters 'appid' and 'url', please restart the program including these.");
                System.Environment.Exit(0);
            }
            
            if (commandLineArgs.ContainsKey("folder"))
            {
                folder = commandLineArgs["folder"];
            }
            else
            {
                Console.WriteLine($"No incoming folder parameter, the folder containing XML files is presumed to be the application installation folder: {folder}");
                folder = AppDomain.CurrentDomain.BaseDirectory;
            }
            
            string [] xmlFilePaths = Directory.GetFiles(folder, "*.xml");

            if (xmlFilePaths == null || xmlFilePaths.Length < 1)
            {
                Console.WriteLine("Please add the XML files in your chosen folder (default is application installation folder if none specified), and restart the program.");
                System.Environment.Exit(0);
            }
            
            string requestUri = $"{url}?appId={appId}";
            HttpClient client = new HttpClient();

            string xmlFileName, personNumber;

            foreach (string xmlFilePath in xmlFilePaths)
            {
                xmlFileName = xmlFilePath.Split("\\").Last();

                // The person number is the XML filename
                personNumber = xmlFileName.Split(".").First();

                Instance instanceTemplate = new Instance()
                {
                    InstanceOwnerLookup = new InstanceOwnerLookup()
                    {
                        PersonNumber = personNumber,
                    }
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

            Console.WriteLine("Program finished executing.");
        }
    }

    /// <summary>
    /// Basic Command Line Args extracter
    /// <para>Parse command line args for args in the following format:</para>
    /// <para>    -argname=argvalue -argname=argvalue ...</para>
    /// </summary>
    public class CommandLineArgs
    {
        private const string Pattern = @"\-(?<argname>\w+)=(?<argvalue>.+)";
        private readonly Regex _regex = new Regex(Pattern, RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private readonly Dictionary<String, String> _args = new Dictionary<String, String>();

        public CommandLineArgs()
        {
            BuildArgDictionary();
        }

        public string this[string key]
        {
            get { return _args.ContainsKey(key) ? _args[key] : null; }
        }

        public bool ContainsKey(string key)
        {
            return _args.ContainsKey(key);
        }

        public int Count()
        {
            return _args.Count;
        }

        private void BuildArgDictionary()
        {
            var args = Environment.GetCommandLineArgs();
            
            foreach (var match in args.Select(arg => _regex.Match(arg)).Where(m => m.Success))
            {
                try
                {
                    _args.Add(match.Groups["argname"].Value, match.Groups["argvalue"].Value);
                }
                // Ignore any duplicate args
                catch (Exception) { }
            }
        }
    }
}
