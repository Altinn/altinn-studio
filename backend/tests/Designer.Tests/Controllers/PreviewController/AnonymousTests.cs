﻿using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class AnonymousTests: PreviewControllerTestsBase<AnonymousTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        public AnonymousTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_Anonymous_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/v1/data/anonymous";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals("{}", responseBody).Should().BeTrue();
        }

    }
}
