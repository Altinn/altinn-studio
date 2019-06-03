using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Newtonsoft.Json;
using Storage.Interface.Clients;
using Storage.Interface.Models;

namespace Altinn.Platform.Storage.Client
{
    public class ApplicationClient
    {
        private readonly HttpClient client;
        private readonly string endpointUri;
        private readonly string resourcePrefix = "storage/api/v1/applications";
   
        public ApplicationClient(HttpClient client, string enpointUri = "")
        {
            this.client = client;
            this.endpointUri = enpointUri;
        }

        public Application CreateApplication(string appId, LanguageString title)
        {
            Application application = new Application
            {
                Id = appId,
                Title = title,
                ElementTypes = new List<ElementType>()
            };

            ElementType defaultElementType = new ElementType
            {
                Id = "default",
                AllowedContentType = new List<string>() { "application/xml" }
            };

            application.ElementTypes.Add(defaultElementType);

            return CreateApplication(application) ;                     
        }

        public Application CreateApplication(Application application)
        {
            string url = $"{endpointUri}/{resourcePrefix}?appId={application.Id}";

            HttpResponseMessage response = client.PostAsync(url, application.AsJson()).Result;

            if (!response.IsSuccessStatusCode)
            {
                throw new StorageClientException($"POST failed: {response.StatusCode} - {response.ReasonPhrase}");
            }
            
            string json = response.Content.ReadAsStringAsync().Result;
            Application result = JsonConvert.DeserializeObject<Application>(json);

            return result;
        }

        public Application UpdateApplication(Application application)
        {
            string applicationId = application.Id;

            string url = $"{endpointUri}/{resourcePrefix}/{applicationId}";

            HttpResponseMessage response = client.PutAsync(url, application.AsJson()).Result;

            if (!response.IsSuccessStatusCode)
            {
                throw new StorageClientException($"PUT failed: {response.StatusCode} - {response.ReasonPhrase}");
            }
            
            string json = response.Content.ReadAsStringAsync().Result;        
            Application result = JsonConvert.DeserializeObject<Application>(json);

            return result;
        }

        public Application GetApplication(string appId) 
        {
            string url = $"{endpointUri}/{resourcePrefix}/{appId}";

            HttpResponseMessage response = client.GetAsync(url).Result;

            if (!response.IsSuccessStatusCode)
            {
                throw new StorageClientException($"GET failed: {response.StatusCode} - {response.ReasonPhrase}");
            }

            string json = response.Content.ReadAsStringAsync().Result;
            Application result = JsonConvert.DeserializeObject<Application>(json);

            return result;
        }


        public Application DeleteApplication(string appId)
        {
            string url = $"{endpointUri}/{resourcePrefix}/{appId}?hard=true";

            HttpResponseMessage response = client.DeleteAsync(url).Result;

            if (!response.IsSuccessStatusCode)
            {
                throw new StorageClientException($"DELETE failed: {response.StatusCode} - {response.ReasonPhrase}");
            }
            
            string json = response.Content.ReadAsStringAsync().Result;
            Application result = JsonConvert.DeserializeObject<Application>(json);

            return result;
        }
    }
}
