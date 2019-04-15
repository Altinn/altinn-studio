using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Client;
using Altinn.Platform.Storage.Models;
using Serilog;
using Serilog.Core;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    /// class to test response time for a typical user. To be completed.
    /// </summary>
    public class StorageQueryTime
    {
        private static Random random = new Random();
        private readonly HttpClient client = new HttpClient();
        private string platformUrl = "http://platform.altinn.cloud";
        private readonly bool ignoreTests = false;

        private Logger logger = new LoggerConfiguration()
        .WriteTo.Console()
        .WriteTo.File("log.txt")
        .CreateLogger();

        /// <summary>
        /// Test a user scenario. Create application, multiple get/put changed data,  
        /// </summary>
        //[Fact]
        public async void TestUserScenario()
        {
            StorageClient storage = new StorageClient(new HttpClient());
            int instanceOwnerId = 42;

            // Create application instance
            string instanceId = await storage.PostInstances("TEST/sailor", instanceOwnerId);

            Instance instance = await storage.GetInstances(instanceId, instanceOwnerId);

            Dictionary<string, string> data = new Dictionary<string, string>();
            data.Add("dataFor", instanceOwnerId.ToString());

            storage.PostDataReadFromFile(instanceId, instanceOwnerId, "test.json", "application/json");
            Instance instanceUpdated = await storage.GetInstances(instanceId, instanceOwnerId);
            string dataId = instanceUpdated.Data.Keys.First();

            for (int i = 0; i < 100; i++)
            {
                data.Add("field" + i, RandomString(i));

                logger.Information(data["field"+i]);

                /*
                 storage.PutData(instanceId, dataId, instanceOwnerId, "test.json", "applicatino/json", data);

                var storedData = storage.GetData(instanceId, dataId, instanceOwnerId);
                */
            }
        }
        
        public static string RandomString(int length)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ0123456789";
            return new string(Enumerable.Repeat(chars, length)
              .Select(s => s[random.Next(s.Length)]).ToArray());
        }        
    }
}
