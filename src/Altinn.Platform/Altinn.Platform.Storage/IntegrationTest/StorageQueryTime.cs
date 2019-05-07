using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using Altinn.Platform.Storage.Client;
using Altinn.Platform.Storage.Models;
using Serilog;
using Serilog.Core;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    /// class to test response time for a typical user. To be completed. Not in use.
    /// </summary>
    public class StorageQueryTime
    {
        private static Random random = new Random();
        private readonly HttpClient client = new HttpClient();

        private Logger logger = new LoggerConfiguration()
        .WriteTo.Console()
        .WriteTo.File("log.txt")
        .CreateLogger();

        /// <summary>
        /// Test a user scenario. Create application, multiple get/put changed data,  
        /// </summary>
        /// [Fact]
        public async void TestUserScenario()
        {
            InstanceClient storage = new InstanceClient(new HttpClient());
            int instanceOwnerId = 42;

            // Create application instance
            string instanceId = await storage.PostInstances("TEST-sailor", instanceOwnerId);

            Instance instance = await storage.GetInstances(instanceId, instanceOwnerId);

            Dictionary<string, string> data = new Dictionary<string, string>
            {
                { "dataFor", instanceOwnerId.ToString() }
            };

            await storage.PostDataReadFromFile(instanceId, instanceOwnerId, "test.json", "application/json");
            Instance instanceUpdated = await storage.GetInstances(instanceId, instanceOwnerId);
            string dataId = instance.Data.Find(m => m.FormId.Equals("default")).Id;

            for (int i = 0; i < 100; i++)
            {
                data.Add("field" + i, RandomString(i));

                logger.Information(data["field" + i]);

                /*
                 storage.PutData(instanceId, dataId, instanceOwnerId, "test.json", "applicatino/json", data);

                var storedData = storage.GetData(instanceId, dataId, instanceOwnerId);
                */
            }
        }

        /// <summary>
        /// Generate a random string of a given length
        /// </summary>
        /// <param name="length">the length</param>
        /// <returns></returns>
        public static string RandomString(int length)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ0123456789";
            return new string(Enumerable.Repeat(chars, length)
              .Select(s => s[random.Next(s.Length)]).ToArray());
        }        
    }
}
