using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// implementation for data handling
    /// </summary>
    public class DataAppSI : IData
    {
        private readonly PlatformSettings _platformSettings;
        private readonly ILogger _logger;

        private const string FORM_ID = "default";

        /// <summary>
        /// Initializes a new data of the <see cref="DataAppSI"/> class.
        /// </summary>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="logger">the logger</param>
        public DataAppSI(IOptions<PlatformSettings> platformSettings, ILogger<DataAppSI> logger)
        {
            _platformSettings = platformSettings.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<Instance> InsertData<T>(T dataToSerialize, Guid instanceId, Type type, string org, string appName, int instanceOwnerId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceId}";

            string apiUrl = $"{_platformSettings.GetApiStorageEndpoint}instances/{instanceIdentifier}/data?elementType={FORM_ID}";
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
                        _logger.Log(LogLevel.Error, "unable to save form data for instance{0} due to response {1}", instanceId, response.Result.StatusCode);
                        return null;
                    }

                    string instanceData = await response.Result.Content.ReadAsStringAsync();
                    instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                }
            }

            return instance;
        }

        /// <inheritdoc />
        public void UpdateData<T>(T dataToSerialize, Guid instanceId, Type type, string org, string appName, int instanceOwnerId, Guid dataId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceId}";

            string apiUrl = $"{_platformSettings.GetApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataId}";

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
                        _logger.LogError($"Unable to save form model for instance {instanceId}");
                    }
                }
            }
        }

        /// <inheritdoc />
        public object GetFormData(Guid instanceId, Type type, string org, string appName, int instanceOwnerId, Guid dataId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceId}";

            string apiUrl = $"{_platformSettings.GetApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataId}";
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
        public async Task<List<AttachmentList>> GetFormAttachments(string org, string appName, int instanceOwnerId, Guid instanceId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceId}";

            List<DataElement> dataList = null;
            List<AttachmentList> attachmentList = new List<AttachmentList>();
            string apiUrl = $"{_platformSettings.GetApiStorageEndpoint}instances/{instanceIdentifier}/data";
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);

                HttpResponseMessage response = await client.GetAsync(apiUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string instanceData = await response.Content.ReadAsStringAsync();
                    dataList = JsonConvert.DeserializeObject<List<DataElement>>(instanceData);

                    ExtractAttachments(dataList, attachmentList);
                }
                else
                {
                    _logger.Log(LogLevel.Error, "Unable to fetch attachment list {0}", response.StatusCode);                    
                }

                return attachmentList;
            }
        }

        private static void ExtractAttachments(List<DataElement> dataList, List<AttachmentList> attachmentList)
        {
            List<Attachment> attachments = null;
            IEnumerable<DataElement> attachmentTypes = dataList.GroupBy(m => m.ElementType).Select(m => m.FirstOrDefault());

            foreach (DataElement attachmentType in attachmentTypes)
            {
                attachments = new List<Attachment>();
                foreach (DataElement data in dataList)
                {
                    if (data.ElementType != "default" && data.ElementType == attachmentType.ElementType)
                    {
                        attachments.Add(new Attachment
                        {
                            Id = data.Id,
                            Name = data.FileName,
                            Size = data.FileSize
                        });
                    }
                }

                if (attachments.Count > 0)
                {
                    attachmentList.Add(new AttachmentList { Type = attachmentType.ElementType, Attachments = attachments });
                }
            }

            if (attachments != null && attachments.Count > 0)
            {
                attachmentList.Add(new AttachmentList { Type = "attachments", Attachments = attachments });
            }
        }

        /// <inheritdoc />
        public void DeleteFormAttachment(string org, string appName, int instanceOwnerId, Guid instanceId, string attachmentType, string attachmentId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceId}";

            List<AttachmentList> attachmentList = new List<AttachmentList>();
            string apiUrl = $"{_platformSettings.GetApiStorageEndpoint}instances/{instanceIdentifier}/data/{attachmentId}";
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);

                Task<HttpResponseMessage> response = client.DeleteAsync(apiUrl);
                response.Result.EnsureSuccessStatusCode();
            }
        }

        /// <inheritdoc />
        public async Task<Guid> SaveFormAttachment(string org, string appName, int instanceOwnerId, Guid instanceId, string attachmentType, string attachmentName, HttpRequest attachment)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceId}";

            string apiUrl = $"{_platformSettings.GetApiStorageEndpoint}instances/{instanceIdentifier}/data?elementType={attachmentType}&attachmentName={attachmentName}";
            Instance instance;

            FileExtensionContentTypeProvider provider = new FileExtensionContentTypeProvider();
            string contentType;
            provider.TryGetContentType(attachmentName, out contentType);
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);
                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue(contentType));
                
                using (Stream input = attachment.Body)
                {
                    HttpContent fileStreamContent = new StreamContent(input);

                    using (MultipartFormDataContent formData = new MultipartFormDataContent())
                    {
                        fileStreamContent.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
                        ContentDispositionHeaderValue header = new ContentDispositionHeaderValue("form-data");
                        header.FileName = attachmentName;
                        header.Size = attachment.ContentLength;
                        formData.Headers.ContentDisposition = header;
                        formData.Add(fileStreamContent, attachmentType, attachmentName);
                        HttpResponseMessage response = client.PostAsync(apiUrl, formData).Result;

                        response.EnsureSuccessStatusCode();

                        string instancedata = await response.Content.ReadAsStringAsync();
                        instance = JsonConvert.DeserializeObject<Instance>(instancedata);
                        return Guid.Parse(instance.Data.Find(m => m.FileName.Equals(attachmentName)).Id);
                    }
                }
            }
        }
    }
}
