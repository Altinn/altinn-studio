using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Newtonsoft.Json;
using Storage.Interface.Clients;

namespace Altinn.Platform.Storage.Client
{
    public class ApplicationMetadataClient
    {
        private readonly HttpClient client;
        private readonly string endpointUri;
        private readonly string resourcePrefix = "storage/api/v1/applications";

        public ApplicationMetadataClient(HttpClient client, string enpointUri = "")
        {
            this.client = client;
            this.endpointUri = enpointUri;
        }

        public ApplicationMetadata GetOrCreateApplication(string applicationId)
        {
            ApplicationMetadata appMeta = GetApplicationMetadata(applicationId);
            if (appMeta == null)
            {
                appMeta = CreateApplication(applicationId);
            }

            return appMeta;
        }

        public ApplicationMetadata CreateApplication(string applicationId)
        {
            Dictionary<string, string> title = new Dictionary<string, string>
            {
                { "nb", "Tittel" }
            };

            return CreateApplication(applicationId, title);
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

            string url = endpointUri + resourcePrefix + "?applicationId=" + applicationId;
 
            HttpResponseMessage response = client.PostAsync(url, appMetadata.AsJson()).Result;
            response.EnsureSuccessStatusCode();

            string json = response.Content.ReadAsStringAsync().Result;
            ApplicationMetadata application = JsonConvert.DeserializeObject<ApplicationMetadata>(json);

            return application;                     
        }

        public ApplicationMetadata CreateApplication(ApplicationMetadata application)
        {
            string url = $"{endpointUri}/{resourcePrefix}?applicationId={application.Id}";

            HttpResponseMessage response = client.PostAsync(url, application.AsJson()).Result;
            response.EnsureSuccessStatusCode();

            string json = response.Content.ReadAsStringAsync().Result;
            ApplicationMetadata result = JsonConvert.DeserializeObject<ApplicationMetadata>(json);

            return result;
        }

        public ApplicationMetadata UpdateApplicationMetadata(ApplicationMetadata application)
        {
            string applicationId = application.Id;

            string url = $"{endpointUri}/{resourcePrefix}/{applicationId}";

            HttpResponseMessage response = client.PutAsync(url, application.AsJson()).Result;
            response.EnsureSuccessStatusCode();

            string json = response.Content.ReadAsStringAsync().Result;        
            ApplicationMetadata result = JsonConvert.DeserializeObject<ApplicationMetadata>(json);

            return result;
        }

        public ApplicationMetadata GetApplicationMetadata(string applicationId) 
        {
            string url = $"{endpointUri}/{resourcePrefix}/{applicationId}";

            HttpResponseMessage response = client.GetAsync(url).Result;
            response.EnsureSuccessStatusCode();

            string json = response.Content.ReadAsStringAsync().Result;
            ApplicationMetadata result = JsonConvert.DeserializeObject<ApplicationMetadata>(json);

            return result;
        }


        public ApplicationMetadata DeleteApplicationMetadata(string applicationId)
        {
            string url = $"{endpointUri}/{resourcePrefix}/{applicationId}?hard=true";

            HttpResponseMessage response = client.DeleteAsync(url).Result;
            response.EnsureSuccessStatusCode();

            string json = response.Content.ReadAsStringAsync().Result;
            ApplicationMetadata result = JsonConvert.DeserializeObject<ApplicationMetadata>(json);

            return result;
        }
    }
}
