using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class PostAttachmentTests : PreviewControllerTestsBase<PostAttachmentTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public PostAttachmentTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Post_Attachment_Ok()
        {
            Instance instance = await CreateInstance();
            string dataPathWithData = $"{Org}/{AppV3Path}/instances/{PartyId}/{instance.Id}/data?dataType=FileUploadId";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        [Fact]
        public async Task Post_AttachmentForV4App_Ok()
        {
            Instance instance = await CreateInstance();
            string dataPathWithData = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/data?dataType=FileUploadId";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status201Created, (int)response.StatusCode);
        }
    }
}
