using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.App.Services.Clients;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// App implementation of the data handling service.
    /// </summary>
    public class DataAppSI : IData
    {
        private readonly PlatformSettings _platformSettings;
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly JwtCookieOptions _cookieOptions;
        private readonly HttpClient _client;

        private const string FORM_ID = "default";

        /// <summary>
        /// Initializes a new data of the <see cref="DataAppSI"/> class.
        /// </summary>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="logger">the logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="cookieOptions">The cookie options </param>
        /// <param name="httpClientAccessor">The http client accessor </param>
        public DataAppSI(
            IOptions<PlatformSettings> platformSettings,
            ILogger<DataAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            IOptions<JwtCookieOptions> cookieOptions,
            IHttpClientAccessor httpClientAccessor)
        {
            _platformSettings = platformSettings.Value;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _cookieOptions = cookieOptions.Value;
            _client = httpClientAccessor.StorageClient;
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

        public async Task<DataElement> InsertFormData<T>(Instance instance, string dataType, T dataToSerialize, Type type)
        {
          
            string apiUrl = $"instances/{instance.Id}/data?dataType={dataType ?? FORM_ID}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);
            DataElement dataElement;

            XmlSerializer serializer = new XmlSerializer(type);
            using MemoryStream stream = new MemoryStream();

            serializer.Serialize(stream, dataToSerialize);
            stream.Position = 0;
            StreamContent streamContent = new StreamContent(stream);
            streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/xml");
            Task<HttpResponseMessage> response = _client.PostAsync(apiUrl, streamContent);
            if (!response.Result.IsSuccessStatusCode)
            {
                _logger.Log(LogLevel.Error, "unable to save form data for instance{0} due to response {1}", instance.Id, response.Result.StatusCode);
                return null;
            }

            string instanceData = await response.Result.Content.ReadAsStringAsync();
            dataElement = JsonConvert.DeserializeObject<DataElement>(instanceData);

            return dataElement;
        }

        /// <inheritdoc />
        public async Task<DataElement> UpdateData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerId, Guid dataId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            XmlSerializer serializer = new XmlSerializer(type);
            using MemoryStream stream = new MemoryStream();
            serializer.Serialize(stream, dataToSerialize);
            stream.Position = 0;
            StreamContent streamContent = new StreamContent(stream);
            streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/xml");

            Task<HttpResponseMessage> response = _client.PutAsync(apiUrl, streamContent);
            if (!response.Result.IsSuccessStatusCode)
            {
                _logger.LogError($"Unable to save form model for instance {instanceGuid}");
            }

            string instanceData = await response.Result.Content.ReadAsStringAsync();
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(instanceData);
            return dataElement;
        }

        /// <inheritdoc />
        public Task<Stream> GetBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            HttpResponseMessage response = _client.GetAsync(apiUrl).Result;

            if (response.IsSuccessStatusCode)
            {
                return response.Content.ReadAsStreamAsync();
            }

            return null;
        }

        /// <inheritdoc />
        public async Task<object> GetFormData(Guid instanceGuid, Type type, string org, string app, int instanceOwnerId, Guid dataId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            HttpResponseMessage response = _client.GetAsync(apiUrl).Result;
            if (response.IsSuccessStatusCode)
            {
                XmlSerializer serializer = new XmlSerializer(type);
                try
                {
                    using Stream stream = response.Content.ReadAsStreamAsync().Result;
                    
                    return serializer.Deserialize(stream);                    
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

        /// <inheritdoc />
        public async Task<List<AttachmentList>> GetBinaryDataList(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            List<DataElement> dataList;
            List<AttachmentList> attachmentList = new List<AttachmentList>();

            HttpResponseMessage response = await _client.GetAsync(apiUrl);
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
        public async Task<bool> DeleteBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data/{dataGuid}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);
           
            HttpResponseMessage response = await _client.DeleteAsync(apiUrl);

            if (response.IsSuccessStatusCode)
            {
                return true;
            }
            else
            {
                _logger.LogError($"Deleting form attachment {dataGuid} for instance {instanceGuid} failed with status code {response.StatusCode}");
                throw new PlatformClientException(response);
            }            
        }

        /// <inheritdoc />
        public async Task<DataElement> InsertBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, string dataType, HttpRequest request)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data?dataType={dataType}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            DataElement dataElement;

            StreamContent content = CreateContentStream(request);

            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            HttpResponseMessage response = await _client.PostAsync(apiUrl, content);

            if (response.IsSuccessStatusCode)
            {
                string instancedata = await response.Content.ReadAsStringAsync();
                dataElement = JsonConvert.DeserializeObject<DataElement>(instancedata);

                return dataElement;
            }
            else
            {
                _logger.LogError($"Storing attachment for instance {instanceGuid} failed with status code {response.StatusCode}");
                throw new PlatformClientException(response);
            }
        }

        public async Task<DataElement> InsertBinaryData(string instanceId, string dataType, string contentType, string fileName, Stream stream)
        {          
            string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceId}/data?dataType={dataType}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            DataElement dataElement;

            StreamContent content = new StreamContent(stream);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
            if (!string.IsNullOrEmpty(fileName))
            {
                content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse($"attachment; filename={fileName}");
            }            

            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            HttpResponseMessage response = await _client.PostAsync(apiUrl, content);

            if (response.IsSuccessStatusCode)
            {
                string instancedata = await response.Content.ReadAsStringAsync();
                dataElement = JsonConvert.DeserializeObject<DataElement>(instancedata);

                return dataElement;
            }
            else
            {
                _logger.LogError($"Storing attachment for instance {instanceId} failed with status code {response.StatusCode} - content {await response.Content.ReadAsStringAsync()}");
                throw new PlatformClientException(response);
            }
        }


        /// <inheritdoc />
        public async Task<DataElement> UpdateBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid, HttpRequest request)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);

            StreamContent content = CreateContentStream(request);

            JwtTokenUtil.AddTokenToRequestHeader(_client, token);           

            HttpResponseMessage response = await _client.PutAsync(apiUrl, content);
       
            if (response.IsSuccessStatusCode)
            {
                string instancedata = await response.Content.ReadAsStringAsync();
                DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(instancedata);                

                return dataElement;
            }
            else
            {
                _logger.LogError($"Updating attachment {dataGuid} for instance {instanceGuid} failed with status code {response.StatusCode}");

                throw new PlatformClientException(response);
            }                
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
    }
}
