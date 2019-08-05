using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using Altinn.Platform.Storage.Client;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Models;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest.Fixtures
{
    public class DatabaseFixture : IDisposable
    {
        public InstanceClient Client { get; set; }

        public string App { get; set; }

        public DatabaseFixture()
        {
            //LoadData("tdd/m1000", new InstanceClient(new HttpClient(), "http://localhost"));
        }

        public static void LoadData(string testAppId, InstanceClient client)
        {            
            try
            {
                List<Instance> ins = client.GetInstancesForOrg(testAppId.Split("/")[0], 1000).Result;
                if (ins.Count == 1000)
                {
                    return;
                }
            }
            catch (Exception e)
            {
            }
                        
            string json = File.ReadAllText("data/m1000-instances.json");
            JObject jsonObject = JObject.Parse(json);
            List<Instance> instances = jsonObject["instances"].ToObject<List<Instance>>();

            foreach (Instance instance in instances)
            {
                Instance i = client.PostInstances(testAppId, instance).Result;
            }
        }

        /// <summary>
        ///  Generate test data instances can be returned with query param.
        /// </summary>
        public static void GenerateTestdata(HttpClient client)
        {            
            GenerateInstanceTestData.For1000InstanceOwners(client);
        }

        /// <summary>
        /// Disposes the instances.
        /// </summary>
        public void Dispose()
        {
            /*
            List<Instance> instances = Client.GetInstancesForOrg(App.Split("/")[0], 1000).Result;

            foreach (Instance instance in instances)
            {
                bool ok = Client.DeleteInstance(instance.Id).Result;
            }
            */
        }
    }

    public class DatabaseCollection : ICollectionFixture<DatabaseFixture>
    {
    }
}
