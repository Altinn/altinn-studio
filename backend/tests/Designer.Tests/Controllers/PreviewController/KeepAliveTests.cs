﻿using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class KeepAliveTests : PreviewControllerTestsBase<KeepAliveTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public KeepAliveTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_KeepAlive_Ok()
        {
            string dataPathWithData = $"{Org}/{AppV3}/api/authentication/keepAlive";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
