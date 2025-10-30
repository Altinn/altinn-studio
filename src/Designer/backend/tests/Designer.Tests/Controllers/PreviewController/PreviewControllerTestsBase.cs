#nullable disable
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class PreviewControllerTestsBase<TTestClass>(WebApplicationFactory<Program> factory) : DesignerEndpointsTestsBase<TTestClass>(factory)
    where TTestClass : class
    {
        protected const string Org = "ttd";
        protected const string AppV3 = "app-without-layoutsets";
        protected const string AppV3Path = "app-without-layoutsets/V3";
        protected const string AppV4 = "app-with-layoutsets";
        protected const string PreviewApp = "preview-app";
        protected const string Developer = "testUser";
        protected const string LayoutSetName = "layoutSet1";
        protected const string LayoutSetName2 = "layoutSet2";
        protected const string PartyId = "51001";
        protected const string V3InstanceId = "f1e23d45-6789-1bcd-8c34-56789abcdef0";
        protected const string TaskId = "Task_1";
        protected const string AttachmentGuId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
        protected const string MockedReferrerUrl = "https://studio-mock-url.no";

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            base.ConfigureTestServices(services);
            var cacheServices = services.Where(
                d => d.ServiceType == typeof(IDistributedCache)).ToList();
            foreach (ServiceDescriptor serviceDescriptor in cacheServices)
            {
                services.Remove(serviceDescriptor);
            }

            services.AddDistributedMemoryCache();
        }

        protected async Task<Instance> CreateInstance()
        {
            string dataPath = $"{Org}/{AppV4}/instances?instanceOwnerPartyId={PartyId}&taskId={TaskId}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPath);
            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string responseBody = await response.Content.ReadAsStringAsync();
            Instance dataItem = JsonSerializer.Deserialize<Instance>(responseBody, JsonSerializerOptions);
            Assert.NotNull(dataItem);
            return dataItem;
        }

        protected async Task<DataElement> CreateDataElement(Instance instance, string dataType)
        {
            string dataPathWithData = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/data?dataType={dataType}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);
            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            string responseBody = await response.Content.ReadAsStringAsync();
            DataElement dataElement = JsonSerializer.Deserialize<DataElement>(responseBody, JsonSerializerOptions);
            Assert.NotNull(dataElement);
            return dataElement;
        }

    }
}
