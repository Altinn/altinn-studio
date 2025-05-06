using System;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class UpdateFormDataTests
        : PreviewControllerTestsBase<UpdateFormDataTests>,
            IClassFixture<WebApplicationFactory<Program>>
    {
        public UpdateFormDataTests(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Put_UpdateFormData_Ok()
        {
            Instance instance = await CreateInstance();
            string dataPathWithData =
                $"{Org}/{AppV3Path}/instances/{PartyId}/{instance.Id}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }
    }
}
