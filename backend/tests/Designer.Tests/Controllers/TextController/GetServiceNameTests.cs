﻿using System.Net;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.TextController
{
    public class GetServiceNameTests : DisagnerEndpointsTestsBase<GetServiceNameTests>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/text";
        public GetServiceNameTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "Hvem er hvem?")]
        public async Task GetServiceName_WithValidInput_ReturnsOk(string org, string app, string expectedServiceName)
        {
            string url = $"{VersionPrefix(org, app)}/service-name";

            // Act
            using var response = await HttpClient.GetAsync(url);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string content = await response.Content.ReadAsStringAsync();
            content.Should().BeEquivalentTo(expectedServiceName);
        }
    }
}
