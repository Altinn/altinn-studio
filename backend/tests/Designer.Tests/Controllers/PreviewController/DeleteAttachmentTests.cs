﻿using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class DeleteAttachmentTests : PreviewControllerTestsBase<DeleteAttachmentTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public DeleteAttachmentTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Delete_Attachment_Ok()
        {
            Instance instance = await createInstance();
            DataElement dataElement = await createDataElement(instance, "attachment");
            string dataPathWithData = $"{Org}/{AppV3}/instances/{PartyId}/{instance.Id}/data/{dataElement.Id}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV3}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task Delete_AttachmentForV4App_Ok()
        {
            Instance instance = await createInstance();
            DataElement dataElement = await createDataElement(instance, "attachment");
            string dataPathWithData = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/data/{dataElement.Id}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV4}&selectedLayoutSet={LayoutSetName}");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
