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
        private string storageUri = string.Empty; //"http://platform.altinn.cloud/";
        private string resourcePrefix = "api/storage/v1/applications";

        public ApplicationMetadataClient(HttpClient client)
        {
            this.client = client;
        }

        public ApplicationMetadata CreateApplication(string applicationId, Dictionary<string, string> title)
        {
            ApplicationMetadata appMetadata = new ApplicationMetadata();

            appMetadata.Id = applicationId;
            appMetadata.Title = title;
            appMetadata.Forms = new List<ApplicationForm>();

            ApplicationForm defaultAppForm = new ApplicationForm();

            defaultAppForm.Id = "default";
            defaultAppForm.AllowedContentType = new List<string>() { "application/xml" };

            appMetadata.Forms.Add(defaultAppForm);

            string uri = storageUri + resourcePrefix + "?applicationId=" + applicationId;

            HttpResponseMessage response = client.PostAsync(uri, appMetadata.AsJson()).Result;

            response.EnsureSuccessStatusCode();

            string json2 = response.Content.ReadAsStringAsync().Result;
            ApplicationMetadata application = JsonConvert.DeserializeObject<ApplicationMetadata>(json2);

            return application;
        }
    }
}
