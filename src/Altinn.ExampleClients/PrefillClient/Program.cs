using Altinn.Platform.Storage.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Linq;
using Storage.Interface.Clients;

namespace Altinn.Clients.PrefillClient
{
    class Program
    {
        static void Main(string[] args)
        {
            Debug.WriteLine("Starting program");

            // Incoming parameters in string[] args: [appId(*)] [endPoint(*)] [input directory(?)]

            string appId = null, endPoint = null, specifiedDirectory = null;

            if (args == null || args.Length < 2)
            {
                Console.WriteLine("Did not find the parameters as prerequisites specified, please run the program again including these.");

                System.Environment.Exit(0);
            }
            else if (args.Length == 2)
            { 
                appId = args[0];
                endPoint = args[1];
                // No input directory specified, use the application installation directory where the XML files will be situated.
                specifiedDirectory = AppDomain.CurrentDomain.BaseDirectory;
            }
            else
            {
                // More than two parameters: The input directory is specified by user
                appId = args[0];
                endPoint = args[1];
                specifiedDirectory = args[2];
            }
            
            string [] xmlFilePaths = Directory.GetFiles(specifiedDirectory, "*.xml");

            if (xmlFilePaths == null || xmlFilePaths.Length < 1)
            {
                Console.WriteLine("Please add the XML files in your input directory, and run the program again.");
                // TO DO: Write error to file in specified directory.
                System.Environment.Exit(0);
            }
            
            string requestUri = $"{endPoint}?appId={appId}";
            HttpClient client = new HttpClient();

            string xmlFileName, personNumber;
            string errorFile = Path.Combine(specifiedDirectory, "error.txt");

            foreach (string xmlFilePath in xmlFilePaths)
            {
                // Get the filename only
                personNumber = xmlFilePath.Split("\\").Last().Split(".").First();

                // Get the person number which is the XML filename.
                // personNumber = xmlFileName.Split(".").First();

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
                        Console.WriteLine($"Failed to instanciate and save prefill on person number {personNumber}.");
                        //Debug.WriteLine($"Failed to instanciate and save prefill on person number {personNumber}.");
                        //Debug.WriteLine($"{response.StatusCode} - {response.ReasonPhrase}");
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
                    if (!File.Exists(errorFile))
                    {
                        File.Create(Path.Combine(errorFile)).Dispose();
                    }

                    using (StreamWriter sw = File.AppendText(errorFile))
                    {
                        sw.WriteLine("============= Error Logging ===========");
                        sw.WriteLine($"=========== Start ============= {DateTime.Now}");
                        sw.WriteLine($"Failed to instanciate and save prefill on person number {personNumber}.");
                        sw.WriteLine($"Error Message: {e.Message}");
                        sw.WriteLine($"=========== End ============= {DateTime.Now}");
                    }
                    
                    Console.WriteLine($"Failed to instanciate and save prefill on person number {personNumber}.");
                }
            }
        }


        
    }
}


    /*
    //client.Timeout = new TimeSpan(0, 0, 3);
    //string prefix = "https://platform.at21.altinn.cloud/storage/api/v1";
    //string prefix = "http://localhost:5010/storage/api/v1";
    //Uri uri = new Uri(prefix + "/instances?appId=tdd/cat");

    // endPoint could be like this: "http://localhost:5010/storage/api/v1/instances"
    */
