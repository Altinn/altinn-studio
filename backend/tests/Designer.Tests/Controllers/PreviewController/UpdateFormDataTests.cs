using System;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class UpdateFormDataTests : PreviewControllerTestsBase<UpdateFormDataTests>
    {

        public UpdateFormDataTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Put_UpdateFormData_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={App}&selectedLayoutSetInEditor=");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }
    }
}
