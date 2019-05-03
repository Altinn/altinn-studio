using System.IO;
using System.Net.Http;
using Altinn.Platform.Storage.Client;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.Models;
using Newtonsoft.Json;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.Platform.Storage.IntegrationTest
{
    public class RuntimeStreamTest : IClassFixture<PlatformStorageFixture>
    {
        HttpClient client;
        private readonly ITestOutputHelper output;

        public RuntimeStreamTest(PlatformStorageFixture fixture, ITestOutputHelper output)
        {
            client = fixture.Client;
            this.output = output;
        }

        [Fact]
        public async void UploadFileToRuntime()
        {
            string applicationId = "TTT-app";
            int instanceOwnerId = 33;
            string formId = "default";

            ApplicationMetadataClient appClient = new ApplicationMetadataClient(client);
            ApplicationMetadata appMeta = appClient.GetOrCreateApplication(applicationId);
            
            InstanceClient storageClient = new InstanceClient(client);
            string instanceId = await storageClient.PostInstances(applicationId, instanceOwnerId);

            using (Stream input = File.OpenRead("data/binary_file.pdf"))
            {
                HttpContent fileStreamContent = new StreamContent(input);
                string url = $"runtime/api/instances/{instanceId}/data?formId={formId}&instanceOwnerId={instanceOwnerId}";

                using (MultipartFormDataContent formDataContent = new MultipartFormDataContent())
                {
                    formDataContent.Add(fileStreamContent, formId, "binary_file.pdf");
                    HttpResponseMessage response = await client.PostAsync(url, formDataContent);

                    response.EnsureSuccessStatusCode();

                    string json = response.Content.ReadAsStringAsync().Result;
                    Instance instance = JsonConvert.DeserializeObject<Instance>(json);

                    Assert.Single(instance.Data);

                    output.WriteLine(instance.ToString());
                }
            }
        }
    }
}
