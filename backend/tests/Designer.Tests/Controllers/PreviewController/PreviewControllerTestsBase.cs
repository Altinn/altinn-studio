﻿using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Designer.Tests.Controllers.PreviewController
{
    public class PreviewControllerTestsBase<TTestClass> : DisagnerEndpointsTestsBase<TTestClass>
    where TTestClass : class
    {
        protected const string Org = "ttd";
        protected const string AppV3 = "app-without-layoutsets";
        protected const string AppV4 = "app-with-layoutsets";
        protected const string PreviewApp = "preview-app";
        protected const string Developer = "testUser";
        protected const string LayoutSetName = "layoutSet1";
        protected const string LayoutSetName2 = "layoutSet2";
        protected const string CustomReceiptLayoutSetName2 = "receipt";
        protected const string DataTypeForCustomReceipt = "receiptDataType";
        protected const string PartyId = "51001";
        protected const string InstanceGuId = "f1e23d45-6789-1bcd-8c34-56789abcdef0";
        protected const string AttachmentGuId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
        protected const string MockedReferrerUrl = "https://studio-mock-url.no";
        protected readonly JsonSerializerOptions SerializerOptions = new JsonSerializerOptions()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        public PreviewControllerTestsBase(WebApplicationFactory<Program> factory) : base(factory)
        {
        }


    }
}
