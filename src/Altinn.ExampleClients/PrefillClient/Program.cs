using Altinn.Platform.Storage.Models;
using Newtonsoft.Json;
using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;

namespace Altinn.Clients.PrefillClient
{
    class Program
    {
        static void Main(string[] args)
        {
            Debug.WriteLine("Starting program");

            Instance instanceTemplate = new Instance()
            {
                InstanceOwnerLookup = new InstanceOwnerLookup()
                {
                    PersonNumber = "01025180093",
                },
                DueDateTime = DateTime.Parse("2019-12-31"),
                VisibleDateTime = DateTime.Parse("2019-10-01"),
            };

            MultipartFormDataContent content = new MultipartContentBuilder(instanceTemplate)
                .AddDataElement("form1", new FileStream("data/schema.xsd", FileMode.Open), "application/xml")
                .AddDataElement("cat", new FileStream("data/process-model.png", FileMode.Open), "image/png")
                .Build();

            HttpClient client = new HttpClient();
            client.Timeout = new TimeSpan(0, 0, 3);
            Uri uri = new Uri("http://altinn3.no/tdd/xyz23/instances");

            try
            {
                HttpResponseMessage response = client.PostAsync(uri, content).Result;

                if (response.IsSuccessStatusCode)
                {
                    string json = response.Content.ReadAsStringAsync().Result;
                    Instance instance = JsonConvert.DeserializeObject<Instance>(json);

                    Debug.WriteLine("Success!");
                    Debug.WriteLine(json);
                }
                else
                {
                    Debug.WriteLine("Fail");
                    Debug.WriteLine($"{response.StatusCode} - {response.ReasonPhrase}");
                }
            }
            catch (Exception e)
            {
                Debug.WriteLine($"An error occured: {e.Message}");
            }
            
        }
    }
}
