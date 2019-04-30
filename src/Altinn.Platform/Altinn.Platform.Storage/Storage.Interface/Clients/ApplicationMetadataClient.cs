using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Newtonsoft.Json;
using Storage.Interface.Clients;

namespace Altinn.Platform.Storage.IntegrationTest.Client
{
    public class ApplicationMetadataClient
    {
        private readonly HttpClient client;
        private readonly string storageUri; //"http://platform.altinn.cloud/";
        private readonly string resourcePrefix = "api/storage/v1/applications";

        public ApplicationMetadataClient(HttpClient client, string storageUri = "")
        {
            this.client = client;
            this.storageUri = storageUri;
        }

        public ApplicationMetadata CreateApplication(string applicationId, Dictionary<string, string> title)
        {
            ApplicationMetadata appMetadata = new ApplicationMetadata
            {
                Id = applicationId,
                Title = title,
                Forms = new List<ApplicationForm>()
            };

            ApplicationForm defaultAppForm = new ApplicationForm
            {
                Id = "default",
                AllowedContentType = new List<string>() { "application/xml" }
            };

            appMetadata.Forms.Add(defaultAppForm);

            string uri = storageUri + resourcePrefix + "?applicationId=" + applicationId;
            try
            {
                HttpResponseMessage response = client.PostAsync(uri, appMetadata.AsJson()).Result;

                response.EnsureSuccessStatusCode();

                string json2 = response.Content.ReadAsStringAsync().Result;
                ApplicationMetadata application = JsonConvert.DeserializeObject<ApplicationMetadata>(json2);

                return application;
            }
            catch (Exception e)
            {
                return null;
            }            
        }
    }
}
