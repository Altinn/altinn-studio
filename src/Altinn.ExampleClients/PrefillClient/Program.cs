using Altinn.Platform.Storage.Models;
using System;
using System.IO;
using System.Net.Http;
using System.Linq;

namespace Altinn.Clients.PrefillClient
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Starting program.");

            string appId = null, endPoint = null, specifiedDirectory = null;

            if (args.Length > 3)
            {
                for (int i = 0; i < args.Length; i++)
                {
                    string parameter = args[i].ToLower();
                    switch (parameter)
                    {
                        case "-a":
                            appId = args[++i];
                            Console.WriteLine($"App ID: {appId}");
                            break;
                        case "-e":
                            endPoint = args[++i];
                            Console.WriteLine($"Endpoint: {endPoint}");
                            break;
                        case "-d":
                            specifiedDirectory = args[++i];
                            Console.WriteLine($"Specified directory: {specifiedDirectory}");
                            break;
                    }
                }
            }
            else
            {
                Console.WriteLine("Did not find the parameters as prerequisites specified, please run the program again including these.");
                System.Environment.Exit(0);
            }

            if (string.IsNullOrEmpty(specifiedDirectory))
            {
                // No input directory specified, use the application installation directory where the XML files then is supposed to be situated.
                specifiedDirectory = AppDomain.CurrentDomain.BaseDirectory;
                Console.WriteLine($"Specified directory: {specifiedDirectory}");
            }
            
            string [] xmlFilePaths = Directory.GetFiles(specifiedDirectory, "*.xml");

            if (xmlFilePaths == null || xmlFilePaths.Length < 1)
            {
                Console.WriteLine("Please add the XML files in your input directory, and run the program again.");
                System.Environment.Exit(0);
            }
            
            string requestUri = $"{endPoint}?appId={appId}";
            HttpClient client = new HttpClient();

            string xmlFileName, personNumber;

            foreach (string xmlFilePath in xmlFilePaths)
            {
                xmlFileName = xmlFilePath.Split("\\").Last();

                // Get the person number which is the XML filename.
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
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        WriteLogFile(response.ReasonPhrase, personNumber, specifiedDirectory);
                        Console.WriteLine($"Failed to instanciate and save prefill on person number {personNumber}.");
                    }
                    else
                    {
                        string json = response.Content.ReadAsStringAsync().Result;
                        
                        System.IO.File.WriteAllText($"{specifiedDirectory}\\{personNumber}.json", json);

                        Console.WriteLine($"Successfully instanciated and saved prefill on person number {personNumber}.");
                    }
                }
                catch (Exception e)
                {
                    WriteLogFile(e.Message, personNumber, specifiedDirectory);
                    Console.WriteLine($"Failed to instanciate and save prefill on person number {personNumber}.");
                }
            }
        }

        private static void WriteLogFile(string message, string personNumber, string specifiedDirectory)
        {
            string errorFile = Path.Combine(specifiedDirectory, "error.txt");

            if (!File.Exists(errorFile))
            {
                File.Create(Path.Combine(errorFile)).Dispose();
            }

            using (StreamWriter sw = File.AppendText(errorFile))
            {
                sw.WriteLine("============= Error Logging ===========");
                sw.WriteLine($"=========== Start ============= {DateTime.Now}");
                sw.WriteLine($"Failed to instanciate and save prefill on person number {personNumber}.");
                sw.WriteLine($"Error Message: {message}");
                sw.WriteLine($"=========== End ============= {DateTime.Now}");
            }
        }
    }
}
