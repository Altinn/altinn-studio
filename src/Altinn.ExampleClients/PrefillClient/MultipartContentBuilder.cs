using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;

namespace Altinn.Clients.PrefillClient
{
    public class MultipartContentBuilder
    {
        private MultipartFormDataContent builder;

        public MultipartContentBuilder(Instance instanceTemplate)
        {
            builder = new MultipartFormDataContent();
            if (instanceTemplate != null)
            {
                StringContent instanceContent = new StringContent(JsonConvert.SerializeObject(instanceTemplate), Encoding.UTF8, "application/json");

                builder.Add(instanceContent, "instance");
            }            
        }
        
        public MultipartContentBuilder AddDataElement(string elementType, Stream stream, string contentType)
        {
            StreamContent streamContent = new StreamContent(stream);
            streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);

            builder.Add(streamContent, elementType);

            return this;
        }

        public MultipartContentBuilder AddDataElement(string elementType, StringContent content)
        {                    
            builder.Add(content, elementType);

            return this;
        }

        public MultipartFormDataContent Build()
        {
            return builder;
        }

    }
}
