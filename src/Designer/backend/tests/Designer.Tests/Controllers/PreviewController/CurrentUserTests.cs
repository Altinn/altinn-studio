#nullable disable
using System;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Profile.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class CurrentUserTests : PreviewControllerTestsBase<CurrentUserTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public CurrentUserTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_CurrentUser_Ok()
        {
            string dataPathWithData = $"{Org}/{AppV4}/api/v1/profile/user";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV4}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            UserProfile currentUser = JsonConvert.DeserializeObject<UserProfile>(responseDocument.RootElement.ToString());
            Assert.Equal("previewUser", currentUser.UserName);
        }
    }
}
