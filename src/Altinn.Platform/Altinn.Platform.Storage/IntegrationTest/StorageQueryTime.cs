using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
using Altinn.Platform.Storage.Models;
using Serilog;
using Serilog.Core;
using Xunit;

namespace Altinn.Platform.Test.Integration
{
    /// <summary>
    /// class to test query time for used in correspondance with large test dataset.
    /// </summary>
    public class StorageQueryTime
    {
        private readonly HttpClient client = new HttpClient();
        private string platformUrl = "http://platform.altinn.cloud";
        private readonly bool ignoreTests = false;

        private Logger logger = new LoggerConfiguration()
        .WriteTo.Console()
        .WriteTo.File("log.txt")
        .CreateLogger();

        /// <summary>
        /// You know, the main class.
        /// </summary>
        /// <param name="args">the arguments</param>
        [Fact]
        public void DoQuery()
        {
            StorageQueryTime storageQuery = new StorageQueryTime();

            storageQuery.CrossPartitionQueryApplicationId();
            storageQuery.CrossPartitionQueryApplicationOwner();
            storageQuery.InstanceOwnersInstances();
            storageQuery.OneInstance();
        }

        /// <summary>
        /// perform a cross partition query and measure time
        /// </summary>      
        public async void CrossPartitionQueryApplicationOwner()
        {
            if (ignoreTests)
            {
                return;
            }

            string[] owners = { "SKD", "BRREG", "DIBK", "ACN", "OSLK", "BRMK", "DIFI", "ASKK" };

            logger.Information("CrossPartitionQuery: ApplicationOwnerId");

            foreach (string applicationOwnerId in owners)
            {
                Stopwatch watch = Stopwatch.StartNew();

                string queryURI = platformUrl + "/api/v1/instances/query?applicationOwnerId=" + applicationOwnerId;

                HttpResponseMessage response = await client.GetAsync(queryURI);

                response.EnsureSuccessStatusCode();
                List<Instance> instances = await response.Content.ReadAsAsync<List<Instance>>();

                watch.Stop();

                long elapsedMs = watch.ElapsedMilliseconds;

                logger.Information("Processed {count} instances for applicationOwnerId={AppOwner} in {Elapsed} ms.", instances.Count, applicationOwnerId, elapsedMs);
            }
        }

        /// <summary>
        /// perform a cross partition query and measure time
        /// </summary>
        public async void CrossPartitionQueryApplicationId()
        {
            if (ignoreTests)
            {
                return;
            }

            string[] applications = { "S123", "S201", "S221", "S301", "S401", "S501", "S601", "S801", "S701" };

            logger.Information("CrossPartitionQuery: ApplicationId");

            foreach (string applicationId in applications)
            {
                Stopwatch watch = Stopwatch.StartNew();

                string queryURI = platformUrl + "/api/v1/instances/query?applicationId=" + applicationId;

                HttpResponseMessage response = await client.GetAsync(queryURI);

                response.EnsureSuccessStatusCode();

                List<Instance> instances = await response.Content.ReadAsAsync<List<Instance>>();

                watch.Stop();
                int size = instances.Count;
                long elapsedMs = watch.ElapsedMilliseconds;

                logger.Information("Processed {Instances} for applicationId={Application} in {Elapsed} ms.", size, applicationId, elapsedMs);
            }
        }

        /// <summary>
        /// get one instance and measure time, query within partition.
        /// </summary>
        public async void OneInstance()
        {
            if (ignoreTests)
            {
                return;
            }

            logger.Information("Partition query: Get One instance");

            string[] instances =
                {
                "df2dcdf6-e85f-4b2c-bc0b-c80f79eb4d1e",
                "e92dd338-28ac-41ca-a05d-be38ab621c54",
                "892a6dce-9a5f-40f6-9615-dd7db10f734e",
                "21c39bd7-5953-4c42-acbf-b856e32e04cf",
                "00d1db02-a33c-47b1-b3ce-3c9ead0f08fa",
                };

            foreach (string instanceId in instances)
            {
                Stopwatch watch = Stopwatch.StartNew();

                string queryURI = platformUrl + "/api/v1/instances/" + instanceId + "?instanceOwnerId=50002126";

                HttpResponseMessage response = await client.GetAsync(queryURI);

                response.EnsureSuccessStatusCode();

                Instance instance = await response.Content.ReadAsAsync<Instance>();

                watch.Stop();

                long elapsedMs = watch.ElapsedMilliseconds;
                logger.Information("Processed {one} in {Elapsed} ms.", instanceId, elapsedMs);
            }
        }

        /// <summary>
        /// get one instance and measure time, query within partition.
        /// </summary>
        public async void InstanceOwnersInstances()
        {
            if (ignoreTests)
            {
                return;
            }

            logger.Information("PartitionQuery: all instances of an InstanceOwner");

            string[] instanceOwners = { "50002126", "50002110", "50002000" };

            foreach (string instanceOwnerId in instanceOwners)
            {
                Stopwatch watch = Stopwatch.StartNew();

                string queryURI = platformUrl + "/api/v1/instances/query?instanceOwnerId=" + instanceOwnerId;

                HttpResponseMessage postResponse = await client.GetAsync(queryURI);

                postResponse.EnsureSuccessStatusCode();

                List<Instance> instances = await postResponse.Content.ReadAsAsync<List<Instance>>();
                int size = instances.Count;

                watch.Stop();

                long elapsedMs = watch.ElapsedMilliseconds;
                logger.Information("Processed {size} instances for instanceOwnerId={owner} in {Elapsed} ms.", size, instanceOwnerId, elapsedMs);
            }
        }
    }
}
