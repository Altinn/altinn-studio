using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class DeleteAttachmentTests : PreviewControllerTestsBase<DeleteAttachmentTests>
    {

        public DeleteAttachmentTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Delete_Attachment_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/instances/{PartyId}/{InstanceGuId}/data/{AttachmentGuId}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={App}&selectedLayoutSetInEditor=");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task Delete_AttachmentForStateFulApp_Ok()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/instances/{PartyId}/{InstanceGuId}/data/{AttachmentGuId}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={StatefulApp}&selectedLayoutSetInEditor={LayoutSetName}");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
