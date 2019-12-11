using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.IntegrationTest.Clients;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest.Fixtures
{
    /// <summary>
    /// Attemt to create a database fixture which should load the data into the database. It should be called once by all unit test classes
    /// which are annotated with [Database Collection]. But it requires a Testserver for the client which is genreated by the PlatformStorageFixture.
    /// So this class does not work at the moment.
    /// </summary>
    public class DatabaseFixture : IDisposable
    {
        /// <summary>
        /// Constructor.
        /// </summary>
        public DatabaseFixture()
        {
        }

        /// <summary>
        /// Platform storage Instance client used to talk to storage.
        /// </summary>
        public InstanceClient Client { get; set; }

        /// <summary>
        /// The app's identifier
        /// </summary>
        public string App { get; set; }

        /// <summary>
        /// Method that loads the m1000 dataset into cosmos db
        /// </summary>
        /// <param name="appId">App id</param>
        /// <param name="client">instance client</param>
        public static void LoadData(string appId, InstanceClient client)
        {
            try
            {
                List<Instance> ins = client.GetInstancesForOrg(appId.Split("/")[0], 1000).Result;
                if (ins.Count == 1000)
                {
                    return;
                }
            }
            catch
            {
            }

            string json = File.ReadAllText("data/m1000-instances.json");
            JObject jsonObject = JObject.Parse(json);
            List<Instance> instances = jsonObject["instances"].ToObject<List<Instance>>();

            foreach (Instance instance in instances)
            {
                Instance i = client.PostInstances(appId, instance).Result;
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
        }
    }

    /// <summary>
    /// provides the [Database Collection] annotation.
    /// </summary>
    public class DatabaseCollection : ICollectionFixture<DatabaseFixture>
    {
    }
}
