using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;

using Altinn.App.Common.Serialization;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;

using AltinnCore.Authentication.Utils;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// A client for handling actions on data in Altinn Platform.
    /// </summary>
    public class DataClient : IData
    {
        private readonly PlatformSettings _platformSettings;
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppSettings _settings;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new data of the <see cref="DataClient"/> class.
        /// </summary>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="logger">the logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="settings">The current app settings.</param>
        /// <param name="httpClient">A HttpClient from the built in HttpClient factory.</param>
        public DataClient(
            IOptions<PlatformSettings> platformSettings,
            ILogger<DataClient> logger,
            IHttpContextAccessor httpContextAccessor,
            IOptionsMonitor<AppSettings> settings,
            HttpClient httpClient)
        {
            _platformSettings = platformSettings.Value;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;

            httpClient.BaseAddress = new Uri(_platformSettings.ApiStorageEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
            _client = httpClient;
        }

        /// <inheritdoc />
        public async Task<DataElement> InsertFormData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerPartyId, string dataType)
        {
            Instance instance = new Instance
            {
                Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            };

            return await InsertFormData<T>(instance, dataType, dataToSerialize, type);
        }

        /// <inheritdoc />
        public async Task<DataElement> InsertFormData<T>(Instance instance, string dataType, T dataToSerialize, Type type)
        {
            string apiUrl = $"instances/{instance.Id}/data?dataType={dataType}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            DataElement dataElement;

            XmlSerializer serializer = new XmlSerializer(type);
            using MemoryStream stream = new MemoryStream();

            serializer.Serialize(stream, dataToSerialize);
            stream.Position = 0;
            StreamContent streamContent = new StreamContent(stream);
            streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/xml");
            HttpResponseMessage response = await _client.PostAsync(token, apiUrl, streamContent);

            if (response.IsSuccessStatusCode)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                dataElement = JsonConvert.DeserializeObject<DataElement>(instanceData);

                return dataElement;
            }

            _logger.Log(LogLevel.Error, "unable to save form data for instance{0} due to response {1}", instance.Id, response.StatusCode);
            throw await PlatformHttpException.CreateAsync(response);
        }

        /// <inheritdoc />
        public async Task<DataElement> UpdateData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerPartyId, Guid dataId)
        {
            string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            XmlSerializer serializer = new XmlSerializer(type);
            using MemoryStream stream = new MemoryStream();
            serializer.Serialize(stream, dataToSerialize);
            stream.Position = 0;
            StreamContent streamContent = new StreamContent(stream);
            streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/xml");

            HttpResponseMessage response = await _client.PutAsync(token, apiUrl, streamContent);

            if (response.IsSuccessStatusCode)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(instanceData);
                return dataElement;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }

        /// <inheritdoc />
        public async Task<Stream> GetBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataId)
        {
            string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";

            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.GetAsync(token, apiUrl);

            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsStreamAsync();
            }
            else if (response.StatusCode == HttpStatusCode.NotFound)
            {
                return null;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }

        /// <inheritdoc />
        public async Task<object> GetFormData(Guid instanceGuid, Type type, string org, string app, int instanceOwnerPartyId, Guid dataId)
        {
            string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.GetAsync(token, apiUrl);
            if (response.IsSuccessStatusCode)
            {
                using Stream stream = await response.Content.ReadAsStreamAsync();
                ModelDeserializer deserializer = new ModelDeserializer(_logger, type);
                object model = await deserializer.DeserializeAsync(stream, "application/xml");

                if (deserializer.Error != null)
                {
                    _logger.LogError($"Cannot deserialize XML form data read from storage: {deserializer.Error}");
                    throw new ServiceException(HttpStatusCode.Conflict, $"Cannot deserialize XML form data from storage {deserializer.Error}");
                }

                return model;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }

        /// <inheritdoc />
        public async Task<List<AttachmentList>> GetBinaryDataList(string org, string app, int instanceOwnerPartyId, Guid instanceGuid)
        {
            string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/dataelements";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            DataElementList dataList;
            List<AttachmentList> attachmentList = new List<AttachmentList>();

            HttpResponseMessage response = await _client.GetAsync(token, apiUrl);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                dataList = JsonConvert.DeserializeObject<DataElementList>(instanceData);

                ExtractAttachments(dataList.DataElements, attachmentList);

                return attachmentList;
            }

            _logger.Log(LogLevel.Error, "Unable to fetch attachment list {0}", response.StatusCode);

            throw await PlatformHttpException.CreateAsync(response);
        }

        private static void ExtractAttachments(List<DataElement> dataList, List<AttachmentList> attachmentList)
        {
            List<Attachment> attachments = null;
            IEnumerable<DataElement> attachmentTypes = dataList.GroupBy(m => m.DataType).Select(m => m.FirstOrDefault());

            foreach (DataElement attachmentType in attachmentTypes)
            {
                attachments = new List<Attachment>();
                foreach (DataElement data in dataList)
                {
                    if (data.DataType != "default" && data.DataType == attachmentType.DataType)
                    {
                        attachments.Add(new Attachment
                        {
                            Id = data.Id,
                            Name = data.Filename,
                            Size = data.Size,
                        });
                    }
                }

                if (attachments.Count > 0)
                {
                    attachmentList.Add(new AttachmentList { Type = attachmentType.DataType, Attachments = attachments });
                }
            }

            if (attachments != null && attachments.Count > 0)
            {
                attachmentList.Add(new AttachmentList { Type = "attachments", Attachments = attachments });
            }
        }

        /// <inheritdoc />
        public async Task<bool> DeleteBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid)
        {
            string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data/{dataGuid}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            HttpResponseMessage response = await _client.DeleteAsync(token, apiUrl);

            if (response.IsSuccessStatusCode)
            {
                return true;
            }

            _logger.LogError($"Deleting form attachment {dataGuid} for instance {instanceGuid} failed with status code {response.StatusCode}");
            throw await PlatformHttpException.CreateAsync(response);
        }

        /// <inheritdoc />
        public async Task<DataElement> InsertBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, string dataType, HttpRequest request)
        {
            string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
            string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data?dataType={dataType}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            DataElement dataElement;

            StreamContent content = CreateContentStream(request);

            HttpResponseMessage response = await _client.PostAsync(token, apiUrl, content);

            if (response.IsSuccessStatusCode)
            {
                string instancedata = await response.Content.ReadAsStringAsync();
                dataElement = JsonConvert.DeserializeObject<DataElement>(instancedata);

                return dataElement;
            }

            _logger.LogError($"Storing attachment for instance {instanceGuid} failed with status code {response.StatusCode}");
            throw await PlatformHttpException.CreateAsync(response);
        }

        /// <inheritdoc />
        public async Task<DataElement> InsertBinaryData(string instanceId, string dataType, string contentType, string filename, Stream stream)
        {
            string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceId}/data?dataType={dataType}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);
            DataElement dataElement;

            StreamContent content = new StreamContent(stream);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
            if (!string.IsNullOrEmpty(filename))
            {
                content.Headers.ContentDisposition = new ContentDispositionHeaderValue(DispositionTypeNames.Attachment)
                {
                    FileName = filename,
                    FileNameStar = filename
                };
            }

            HttpResponseMessage response = await _client.PostAsync(token, apiUrl, content);

            if (response.IsSuccessStatusCode)
            {
                string instancedata = await response.Content.ReadAsStringAsync();
                dataElement = JsonConvert.DeserializeObject<DataElement>(instancedata);

                return dataElement;
            }

            _logger.LogError($"Storing attachment for instance {instanceId} failed with status code {response.StatusCode} - content {await response.Content.ReadAsStringAsync()}");
            throw await PlatformHttpException.CreateAsync(response);
        }

        /// <inheritdoc />
        public async Task<DataElement> UpdateBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid, HttpRequest request)
        {
            string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
            string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            StreamContent content = CreateContentStream(request);

            HttpResponseMessage response = await _client.PutAsync(token, apiUrl, content);

            if (response.IsSuccessStatusCode)
            {
                string instancedata = await response.Content.ReadAsStringAsync();
                DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(instancedata);

                return dataElement;
            }

            _logger.LogError($"Updating attachment {dataGuid} for instance {instanceGuid} failed with status code {response.StatusCode}");
            throw await PlatformHttpException.CreateAsync(response);
        }

        private static StreamContent CreateContentStream(HttpRequest request)
        {
            StreamContent content = new StreamContent(request.Body);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse(request.ContentType);

            if (request.Headers.TryGetValue("Content-Disposition", out StringValues headerValues))
            {
                content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse(headerValues.ToString());
            }

            return content;
        }

        /// <inheritdoc />
        public async Task<DataElement> Update(Instance instance, DataElement dataElement)
        {
            string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instance.Id}/dataelements/{dataElement.Id}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

            StringContent jsonString = new StringContent(JsonConvert.SerializeObject(dataElement), Encoding.UTF8, "application/json");
            HttpResponseMessage response = await _client.PutAsync(token, apiUrl, jsonString);

            if (response.IsSuccessStatusCode)
            {
                DataElement result = JsonConvert.DeserializeObject<DataElement>(await response.Content.ReadAsStringAsync());

                return result;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }
    }
}
