using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.PlatformServices.Tests.Data;
using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;

using Xunit;

namespace Altinn.App.PlatformServices.Tests.Implementation
{
    public class DataClientTest
    {
        private readonly Mock<IOptions<PlatformSettings>> platformSettingsOptions;
        private readonly Mock<IOptionsMonitor<AppSettings>> appSettingsOptions;
        private readonly Mock<IHttpContextAccessor> contextAccessor;
        private readonly Mock<ILogger<DataClient>> logger;

        public DataClientTest()
        {
            platformSettingsOptions = new Mock<IOptions<PlatformSettings>>();
            PlatformSettings platformSettings = new () { ApiStorageEndpoint = "http://localhost/" };
            platformSettingsOptions.Setup(s => s.Value).Returns(platformSettings);

            appSettingsOptions = new Mock<IOptionsMonitor<AppSettings>>();
            AppSettings appSettings = new () { RuntimeCookieName = "AltinnStudioRuntime" };
            appSettingsOptions.Setup(s => s.CurrentValue).Returns(appSettings);

            contextAccessor = new Mock<IHttpContextAccessor>();
            contextAccessor.Setup(s => s.HttpContext).Returns(new DefaultHttpContext());

            logger = new Mock<ILogger<DataClient>>();
        }

        [Fact]
        public async Task InsertBinaryData_MethodProduceValidPlatformRequest()
        {
            // Arrange
            HttpRequestMessage platformRequest = null;
            DelegatingHandlerStub delegatingHandler = new (async (HttpRequestMessage request, CancellationToken token) =>
            {
                platformRequest = request;

                DataElement dataElement = new DataElement
                {
                    Id = "DataElement.Id",
                    InstanceGuid = "InstanceGuid"
                };
                await Task.CompletedTask;
                return new HttpResponseMessage() { Content = JsonContent.Create(dataElement) };
            });

            Mock<IOptions<GeneralSettings>> generalSettingsOptions = new Mock<IOptions<GeneralSettings>>();
            var target = new DataClient(
                platformSettingsOptions.Object,
                logger.Object,
                contextAccessor.Object,
                appSettingsOptions.Object,
                new HttpClient(delegatingHandler));

            var stream = new MemoryStream(Encoding.UTF8.GetBytes("This is not a pdf, but no one here will care."));

            // Act
            DataElement actual = await target.InsertBinaryData("instanceId", "catstories", "application/pdf", "a cats story.pdf", stream);

            // Assert
            Assert.NotNull(actual);

            Assert.NotNull(platformRequest);
            Assert.Equal(HttpMethod.Post, platformRequest.Method);
            Assert.EndsWith("dataType=catstories", platformRequest.RequestUri.ToString());
            Assert.Equal("\"a cats story.pdf\"", platformRequest.Content.Headers.ContentDisposition.FileName);
        }

        [Fact]
        public async Task GetFormData_MethodProduceValidPlatformRequest_ReturnedFormIsValid()
        {
            // Arrange
            HttpRequestMessage platformRequest = null;
            DelegatingHandlerStub delegatingHandler = new (async (HttpRequestMessage request, CancellationToken token) =>
            {
                platformRequest = request;

                string serializedModel = string.Empty
                    + @"<?xml version=""1.0""?>"
                    + @"<Skjema xmlns=""urn:no:altinn:skjema:v1"" xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" xmlns:xsd=""http://www.w3.org/2001/XMLSchema"""
                    + @"  skjemanummer=""1472"" spesifikasjonsnummer=""9812"" blankettnummer=""AFP-01"" tittel=""Arbeidsgiverskjema AFP"" gruppeid=""8818"">"
                    + @"  <Foretak-grp-8820 gruppeid=""8820"">"
                    + @"    <EnhetNavnEndring-datadef-31 orid=""31"">Test Test 123</EnhetNavnEndring-datadef-31>"
                    + @"  </Foretak-grp-8820>"
                    + @"</Skjema>";
                await Task.CompletedTask;

                HttpResponseMessage response = new HttpResponseMessage() { Content = new StringContent(serializedModel) };
                response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/xml");
                return response;
            });

            Mock<IOptions<GeneralSettings>> generalSettingsOptions = new Mock<IOptions<GeneralSettings>>();
            var target = new DataClient(
                platformSettingsOptions.Object,
                logger.Object,
                contextAccessor.Object,
                appSettingsOptions.Object,
                new HttpClient(delegatingHandler));

            Guid dataElementGuid = Guid.NewGuid();

            // Act
            object response = await target.GetFormData(Guid.NewGuid(), typeof(SkjemaWithNamespace), "org", "app", 323413, dataElementGuid);

            // Assert
            var actual = response as SkjemaWithNamespace; 
            Assert.NotNull(actual);
            Assert.NotNull(actual.Foretakgrp8820);
            Assert.NotNull(actual.Foretakgrp8820.EnhetNavnEndringdatadef31);

            Assert.NotNull(platformRequest);
            Assert.Equal(HttpMethod.Get, platformRequest.Method);
            Assert.EndsWith($"data/{dataElementGuid}", platformRequest.RequestUri.ToString());
        }

        [Fact]
        public async Task InsertBinaryData_PlatformRespondNotOk_ThrowsPlatformException()
        {
            // Arrange
            HttpRequestMessage platformRequest = null;
            DelegatingHandlerStub delegatingHandler = new (async (HttpRequestMessage request, CancellationToken token) =>
            {
                platformRequest = request;

                DataElement dataElement = new DataElement
                {
                    Id = "DataElement.Id",
                    InstanceGuid = "InstanceGuid"
                };
                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.BadRequest };
            });

            Mock<IOptions<GeneralSettings>> generalSettingsOptions = new Mock<IOptions<GeneralSettings>>();
            var target = new DataClient(
                platformSettingsOptions.Object,
                logger.Object,
                contextAccessor.Object,
                appSettingsOptions.Object,
                new HttpClient(delegatingHandler));

            var stream = new MemoryStream(Encoding.UTF8.GetBytes("This is not a pdf, but no one here will care."));

            PlatformHttpException actual = null;

            // Act
            try
            {
                _ = await target.InsertBinaryData("instanceId", "catstories", "application/pdf", "a cats story.pdf", stream);
            }
            catch (PlatformHttpException phe)
            {
                actual = phe;
            }

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(HttpStatusCode.BadRequest, actual.Response.StatusCode);
        }
    }
}
