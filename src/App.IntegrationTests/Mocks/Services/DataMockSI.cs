using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

using App.IntegrationTests.Utils;

using Microsoft.AspNetCore.Http;

namespace App.IntegrationTests.Mocks.Services
{
    public class DataMockSI : IData
    {
        private readonly IAppResources _applicationService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private static readonly JsonSerializerOptions _serializerOptions = new()
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public DataMockSI(IAppResources application, IHttpContextAccessor httpContextAccessor)
        {
            _applicationService = application;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<bool> DeleteBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid)
        {
            return await DeleteData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid, false);
        }

        public async Task<bool> DeleteData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid, bool delayed)
        {
            await Task.CompletedTask;
            string dataElementPath = TestDataUtil.GetDataElementPath(org, app, instanceOwnerPartyId, instanceGuid, dataGuid);

            if (delayed)
            {
                string fileContent = await File.ReadAllTextAsync(dataElementPath);
                DataElement dataElement = JsonSerializer.Deserialize<DataElement>(fileContent, _serializerOptions);

                dataElement.DeleteStatus = new()
                {
                    IsHardDeleted = true,
                    HardDeleted = DateTime.UtcNow
                };

                WriteDataElementToFile(dataElement, org, app, instanceOwnerPartyId);

                return true;
            }
            else
            {
                string dataBlobPath = TestDataUtil.GetDataBlobPath(org, app, instanceOwnerPartyId, instanceGuid, dataGuid);

                if (File.Exists(dataElementPath))
                {
                    File.Delete(dataElementPath);
                }

                if (File.Exists(dataBlobPath))
                {
                    File.Delete(dataBlobPath);
                }

                return true;
            }
        }

        public Task<Stream> GetBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataId)
        {
            string dataPath = TestDataUtil.GetDataBlobPath(org, app, instanceOwnerPartyId, instanceGuid, dataId);

            Stream ms = new MemoryStream();
            using (FileStream file = new(dataPath, FileMode.Open, FileAccess.Read))
            {
                file.CopyTo(ms);
            }

            return Task.FromResult(ms);
        }

        public async Task<List<AttachmentList>> GetBinaryDataList(string org, string app, int instanceOwnerPartyId, Guid instanceGuid)
        {
            var dataElements = GetDataElements(org, app, instanceOwnerPartyId, instanceGuid);
            List<AttachmentList> list = new List<AttachmentList>();
            foreach (DataElement dataElement in dataElements)
            {
                AttachmentList al = new AttachmentList()
                {
                    Type = dataElement.DataType,
                    Attachments = new List<Attachment>()
                    {
                        new Attachment()
                        {
                            Id = dataElement.Id,
                            Name = dataElement.Filename,
                            Size = dataElement.Size
                        }
                    }
                };
                list.Add(al);
            }

            return list;
        }

        public Task<object> GetFormData(Guid instanceGuid, Type type, string org, string app, int instanceOwnerPartyId, Guid dataId)
        {
            string dataPath = TestDataUtil.GetDataBlobPath(org, app, instanceOwnerPartyId, instanceGuid, dataId);

            XmlSerializer serializer = new(type);
            try
            {
                using FileStream sourceStream = File.Open(dataPath, FileMode.OpenOrCreate);

                return Task.FromResult(serializer.Deserialize(sourceStream));
            }
            catch
            {
                return Task.FromResult(Activator.CreateInstance(type));
            }
        }

        public async Task<DataElement> InsertBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, string dataType, HttpRequest request)
        {
            Guid dataGuid = Guid.NewGuid();
            string dataPath = TestDataUtil.GetDataPath(org, app, instanceOwnerPartyId, instanceGuid);
            DataElement dataElement = new() { Id = dataGuid.ToString(), InstanceGuid = instanceGuid.ToString(), DataType = dataType, ContentType = request.ContentType };

            if (!Directory.Exists(Path.GetDirectoryName(dataPath)))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(dataPath));
            }

            Directory.CreateDirectory(dataPath + @"blob");

            long filesize;

            using (Stream streamToWriteTo = File.Open(dataPath + @"blob/" + dataGuid.ToString(), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.ReadWrite))
            {
                await request.Body.CopyToAsync(streamToWriteTo);
                streamToWriteTo.Flush();
                filesize = streamToWriteTo.Length;
                streamToWriteTo.Close();
            }

            dataElement.Size = filesize;

            WriteDataElementToFile(dataElement, org, app, instanceOwnerPartyId);

            return dataElement;
        }

        public async Task<DataElement> InsertFormData<T>(Instance instance, string dataType, T dataToSerialize, Type type)
        {
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
            string app = instance.AppId.Split("/")[1];
            string org = instance.Org;
            int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);

            return await InsertFormData(dataToSerialize, instanceGuid, type, org, app, instanceOwnerId, dataType);
        }

        public Task<DataElement> InsertFormData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerPartyId, string dataType)
        {
            Guid dataGuid = Guid.NewGuid();
            string dataPath = TestDataUtil.GetDataPath(org, app, instanceOwnerPartyId, instanceGuid);

            DataElement dataElement = new() { Id = dataGuid.ToString(), InstanceGuid = instanceGuid.ToString(), DataType = dataType, ContentType = "application/xml", };

            try
            {
                Directory.CreateDirectory(dataPath + @"blob");

                using (Stream stream = File.Open(dataPath + @"blob/" + dataGuid.ToString(), FileMode.Create, FileAccess.ReadWrite))
                {
                    XmlSerializer serializer = new(type);
                    serializer.Serialize(stream, dataToSerialize);
                }

                WriteDataElementToFile(dataElement, org, app, instanceOwnerPartyId);
            }
            catch
            {
            }

            return Task.FromResult(dataElement);
        }

        public Task<DataElement> UpdateBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid, HttpRequest request)
        {
            throw new NotImplementedException();
        }

        public async Task<DataElement> UpdateBinaryData(InstanceIdentifier instanceIdentifier, string contentType, string filename, Guid dataGuid, Stream stream)
        {
            throw new NotImplementedException();
        }

        public Task<DataElement> UpdateData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerPartyId, Guid dataGuid)
        {
            string dataPath = TestDataUtil.GetDataPath(org, app, instanceOwnerPartyId, instanceGuid);

            DataElement dataElement = GetDataElements(org, app, instanceOwnerPartyId, instanceGuid).FirstOrDefault(de => de.Id == dataGuid.ToString());

            Directory.CreateDirectory(dataPath + @"blob");

            using (Stream stream = File.Open(dataPath + $@"blob{Path.DirectorySeparatorChar}" + dataGuid.ToString(), FileMode.Create, FileAccess.ReadWrite))
            {
                XmlSerializer serializer = new(type);
                serializer.Serialize(stream, dataToSerialize);
            }

            dataElement.LastChanged = DateTime.Now;
            WriteDataElementToFile(dataElement, org, app, instanceOwnerPartyId);

            return Task.FromResult(dataElement);
        }

        public async Task<DataElement> InsertBinaryData(string instanceId, string dataType, string contentType, string filename, Stream stream)
        {
            Application application = _applicationService.GetApplication();
            var instanceIdParts = instanceId.Split("/");

            Guid dataGuid = Guid.NewGuid();

            string org = application.Org;
            string app = application.Id.Split("/")[1];
            int instanceOwnerId = int.Parse(instanceIdParts[0]);
            Guid instanceGuid = Guid.Parse(instanceIdParts[1]);

            string dataPath = TestDataUtil.GetDataPath(org, app, instanceOwnerId, instanceGuid);

            DataElement dataElement = new() { Id = dataGuid.ToString(), InstanceGuid = instanceGuid.ToString(), DataType = dataType, ContentType = contentType, };

            if (!Directory.Exists(Path.GetDirectoryName(dataPath)))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(dataPath));
            }

            Directory.CreateDirectory(dataPath + @"blob");

            long filesize;

            using (Stream streamToWriteTo = File.Open(dataPath + @"blob/" + dataGuid.ToString(), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.ReadWrite))
            {
                stream.Seek(0, SeekOrigin.Begin);
                await stream.CopyToAsync(streamToWriteTo);
                streamToWriteTo.Flush();
                filesize = streamToWriteTo.Length;
            }

            dataElement.Size = filesize;
            WriteDataElementToFile(dataElement, org, app, instanceOwnerId);

            return dataElement;
        }

        public Task<DataElement> Update(Instance instance, DataElement dataElement)
        {
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];
            int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);

            WriteDataElementToFile(dataElement, org, app, instanceOwnerId);

            return Task.FromResult(dataElement);
        }

        private static void WriteDataElementToFile(DataElement dataElement, string org, string app, int instanceOwnerPartyId)
        {
            string dataElementPath = TestDataUtil.GetDataElementPath(org, app, instanceOwnerPartyId, Guid.Parse(dataElement.InstanceGuid), Guid.Parse(dataElement.Id));

            string jsonData = JsonSerializer.Serialize(dataElement, _serializerOptions);

            using StreamWriter sw = new(dataElementPath);

            sw.Write(jsonData.ToString());
            sw.Close();
        }

        private List<DataElement> GetDataElements(string org, string app, int instanceOwnerId, Guid instanceId)
        {
            string path = TestDataUtil.GetDataPath(org, app, instanceOwnerId, instanceId);
            List<DataElement> dataElements = new();

            if (!Directory.Exists(path))
            {
                return null;
            }

            string[] files = Directory.GetFiles(path);

            foreach (string file in files)
            {
                string content = File.ReadAllText(Path.Combine(path, file));
                DataElement dataElement = JsonSerializer.Deserialize<DataElement>(content, _serializerOptions);

                if (dataElement.DeleteStatus?.IsHardDeleted == true && string.IsNullOrEmpty(_httpContextAccessor.HttpContext.User.GetOrg()))
                {
                    continue;
                }

                dataElements.Add(dataElement);
            }

            return dataElements;
        }
    }
}
