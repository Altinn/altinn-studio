using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Xml.Serialization;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// implementation for data handling
    /// </summary>
    public class DataAppSI : IData
    {
        private readonly PlatformStorageSettings _platformStorageSettings;

        private const string FORM_ID = "default";

        /// <summary>
        /// Initializes a new data of the <see cref="DataAppSI"/> class.
        /// </summary>
        /// <param name="platformStorageSettings">the storage settings</param>
        public DataAppSI(IOptions<PlatformStorageSettings> platformStorageSettings)
        {
            _platformStorageSettings = platformStorageSettings.Value;
        }

        /// <inheritdoc />
        public async Task<Instance> InsertData<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId)
        {
            string apiUrl = $"{_platformStorageSettings.ApiUrl}/instances/{instanceId}/data?formId={FORM_ID}&instanceOwnerId={instanceOwnerId}";
            Instance instance;
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);
                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));

                XmlSerializer serializer = new XmlSerializer(type);
                using (MemoryStream stream = new MemoryStream())
                {
                    serializer.Serialize(stream, dataToSerialize);
                    stream.Position = 0;
                    StreamContent streamContent = new StreamContent(stream);
                    streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/xml");
                    Task<HttpResponseMessage> response = client.PostAsync(apiUrl, streamContent);
                    if (!response.Result.IsSuccessStatusCode)
                    {
                        throw new Exception("Unable to save form model");
                    }

                    string instanceData = await response.Result.Content.ReadAsStringAsync();
                    instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                }
            }

            return instance;
        }

        /// <inheritdoc />
        public void UpdateData<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId, Guid dataId)
        {
            string apiUrl = $"{_platformStorageSettings.ApiUrl}/instances/{instanceId}/data/{dataId}?instanceOwnerId={instanceOwnerId}";

            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);
                XmlSerializer serializer = new XmlSerializer(type);
                using (MemoryStream stream = new MemoryStream())
                {
                    serializer.Serialize(stream, dataToSerialize);
                    stream.Position = 0;
                    StreamContent streamContent = new StreamContent(stream);
                    streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/xml");
                    Task<HttpResponseMessage> response = client.PutAsync(apiUrl, streamContent);
                    if (!response.Result.IsSuccessStatusCode)
                    {
                        throw new Exception("Unable to save form model");
                    }
                }
            }
        }

        /// <inheritdoc />
        public object GetFormData(Guid instanceId, Type type, string applicationOwner, string applicationId, int instanceOwnerId, Guid dataId)
        {
            string apiUrl = $"{_platformStorageSettings.ApiUrl}/instances/{instanceId}/data/{dataId}?instanceOwnerId={instanceOwnerId}";
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);
                Task<HttpResponseMessage> response = client.GetAsync(apiUrl);
                if (response.Result.IsSuccessStatusCode)
                {
                    XmlSerializer serializer = new XmlSerializer(type);
                    try
                    {
                        using (Stream stream = response.Result.Content.ReadAsStreamAsync().Result)
                        {
                            return serializer.Deserialize(stream);
                        }
                    }
                    catch
                    {
                        return Activator.CreateInstance(type);
                    }
                }
                else
                {
                    return Activator.CreateInstance(type);
                }
            }
        }

        /// <inheritdoc />
        public List<AttachmentList> GetFormAttachments(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid instanceId)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc />
        public void DeleteFormAttachment(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid instanceId, string attachmentType, string attachmentId)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc />
        public Task<Guid> SaveFormAttachment(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid instanceId, string attachmentType, string attachmentName, HttpRequest attachment)
        {
            throw new NotImplementedException();
        }
    }
}
