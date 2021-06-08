using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Xml.Serialization;

using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;

using Newtonsoft.Json;

namespace App.IntegrationTests.Mocks.Services
{
    public class DataMockSI : IData
    {
        private readonly IAppResources _applicationService;

        public DataMockSI(IAppResources application)
        {
            _applicationService = application;
        }

        public Task<bool> DeleteBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
        {
            throw new NotImplementedException();
        }

        public Task<Stream> GetBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataId)
        {
            string dataPath = GetDataBlobPath(org, app.Split("/")[1], instanceOwnerId, instanceGuid, dataId);

            Stream ms = new MemoryStream();
            using (FileStream file = new FileStream(dataPath, FileMode.Open, FileAccess.Read))
            {
                file.CopyTo(ms);
            }

            return Task.FromResult(ms);
        }

        public Task<List<AttachmentList>> GetBinaryDataList(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            throw new NotImplementedException();
        }

        public async Task<object> GetFormData(Guid instanceGuid, Type type, string org, string app, int instanceOwnerId, Guid dataId)
        {
            string dataPath = GetDataBlobPath(org, app, instanceOwnerId, instanceGuid, dataId);

            XmlSerializer serializer = new XmlSerializer(type);
            try
            {
                using FileStream sourceStream = File.Open(dataPath, FileMode.OpenOrCreate);

                return serializer.Deserialize(sourceStream);
            }
            catch
            {
                return Activator.CreateInstance(type);
            }
        }

        public async Task<DataElement> InsertBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, string dataType, HttpRequest request)
        {
            Guid dataGuid = Guid.NewGuid();
            string dataPath = GetDataPath(org, app, instanceOwnerId, instanceGuid);
            Instance instance = GetTestInstance(app, org, instanceOwnerId, instanceGuid);
            DataElement dataElement = new DataElement() { Id = dataGuid.ToString(), DataType = dataType, ContentType = request.ContentType };
            
            if (!Directory.Exists(Path.GetDirectoryName(dataPath)))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(dataPath));
            }

            Directory.CreateDirectory(dataPath + @"blob");

            long filesize;

            using (Stream streamToWriteTo = File.Open(dataPath + @"blob\" + dataGuid.ToString(), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.ReadWrite))
            {
                await request.Body.CopyToAsync(streamToWriteTo);
                streamToWriteTo.Flush();
                filesize = streamToWriteTo.Length;
                streamToWriteTo.Close();
            }

            dataElement.Size = filesize;
            string jsonData = JsonConvert.SerializeObject(dataElement);
            using StreamWriter sw = new StreamWriter(dataPath + dataGuid.ToString() + @".json");

            sw.Write(jsonData.ToString());
            sw.Close();

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

        public async Task<DataElement> InsertFormData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerId, string dataType)
        {
            Guid dataGuid = Guid.NewGuid();
            string dataPath = GetDataPath(org, app, instanceOwnerId, instanceGuid);

            Instance instance = GetTestInstance(app, org, instanceOwnerId, instanceGuid);

            DataElement dataElement = new DataElement() { Id = dataGuid.ToString(), DataType = dataType, ContentType = "application/xml", };

            try
            {
                Directory.CreateDirectory(dataPath + @"blob");

                using (Stream stream = File.Open(dataPath + @"blob\" + dataGuid.ToString(), FileMode.Create, FileAccess.ReadWrite))
                {
                    XmlSerializer serializer = new XmlSerializer(type);
                    serializer.Serialize(stream, dataToSerialize);
                }

                string jsonData = JsonConvert.SerializeObject(dataElement);
                using StreamWriter sw = new StreamWriter(dataPath + dataGuid.ToString() + @".json");

                sw.Write(jsonData.ToString());
                sw.Close();
            }
            catch
            {
            }

            instance.Data = GetDataElements(org, app, instanceOwnerId, instanceGuid);

            return dataElement;
        }

        public Task<DataElement> UpdateBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid, HttpRequest request)
        {
            throw new NotImplementedException();
        }

        public Task<DataElement> UpdateData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerId, Guid dataId)
        {
            string dataPath = GetDataPath(org, app, instanceOwnerId, instanceGuid);

            Instance instance = GetTestInstance(app, org, instanceOwnerId, instanceGuid);

            DataElement dataElement = instance.Data.FirstOrDefault(r => r.Id.Equals(dataId.ToString()));

            Directory.CreateDirectory(dataPath + @"blob");

            using (Stream stream = File.Open(dataPath + @"blob\" + dataId.ToString(), FileMode.Create, FileAccess.ReadWrite))
            {
                XmlSerializer serializer = new XmlSerializer(type);
                serializer.Serialize(stream, dataToSerialize);
            }

            dataElement.LastChanged = DateTime.Now;
            string jsonData = JsonConvert.SerializeObject(dataElement);
            using StreamWriter sw = new StreamWriter(dataPath + dataId.ToString() + @".json");

            sw.Write(jsonData.ToString());
            sw.Close();

            return Task.FromResult(dataElement);
        }

        private string GetDataPath(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\", org + @"\", app + @"\", instanceOwnerId + @"\", instanceGuid.ToString() + @"\");
        }

        private string GetDataBlobPath(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\", org + @"\", app + @"\", instanceOwnerId + @"\", instanceGuid.ToString() + @"\blob\" + dataId.ToString());
        }

        private Instance GetTestInstance(string app, string org, int instanceOwnerId, Guid instanceId)
        {
            string instancePath = Path.Combine(GetInstancePath(), org + @"\" + app + @"\" + instanceOwnerId + @"\" + instanceId.ToString() + ".json");
            if (File.Exists(instancePath))
            {
                string content = File.ReadAllText(instancePath);
                Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                instance.Data = GetDataElements(org, app, instanceOwnerId, instanceId);
                return instance;
            }

            return null;
        }

        private string GetInstancePath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances");
        }

        private List<DataElement> GetDataElements(string org, string app, int instanceOwnerId, Guid instanceId)
        {
            string path = GetDataPath(org, app, instanceOwnerId, instanceId);
            List<DataElement> dataElements = new List<DataElement>();

            if (!Directory.Exists(path))
            {
                return null;
            }

            string[] files = Directory.GetFiles(path);

            foreach (string file in files)
            {
                string content = File.ReadAllText(Path.Combine(path, file));
                DataElement dataElement = (DataElement)JsonConvert.DeserializeObject(content, typeof(DataElement));
                dataElements.Add(dataElement);
            }

            return dataElements;
        }

        public async Task<DataElement> InsertBinaryData(string instanceId, string dataType, string contentType, string filename, Stream stream)
        {
            Application app = _applicationService.GetApplication();

            Guid dataGuid = Guid.NewGuid();
            string dataPath = GetDataPath(app.Org, app.Id.Split("/")[1], Convert.ToInt32(instanceId.Split("/")[0]), new Guid(instanceId.Split("/")[1]));

            DataElement dataElement = new DataElement() { Id = dataGuid.ToString(), DataType = dataType, ContentType = contentType, };

            if (!Directory.Exists(Path.GetDirectoryName(dataPath)))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(dataPath));
            }

            Directory.CreateDirectory(dataPath + @"blob");

            long filesize;

            using (Stream streamToWriteTo = File.Open(dataPath + @"blob\" + dataGuid.ToString(), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.ReadWrite))
            {
                await stream.CopyToAsync(streamToWriteTo);
                streamToWriteTo.Flush();
                filesize = streamToWriteTo.Length;
            }

            dataElement.Size = filesize;
            string jsonData = JsonConvert.SerializeObject(dataElement);
            using StreamWriter sw = new StreamWriter(dataPath + dataGuid.ToString() + @".json");

            sw.Write(jsonData.ToString());
            sw.Close();

            return dataElement;
        }

        public Task<DataElement> Update(Instance instance, DataElement dataElement)
        {
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];
            int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            string path = GetDataPath(org, app, instanceOwnerId, instanceGuid);

            string jsonData = JsonConvert.SerializeObject(dataElement);
            using StreamWriter sw = new StreamWriter(path + dataElement.Id + @".json");

            sw.Write(jsonData.ToString());
            sw.Close();

            return Task.FromResult(dataElement);
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

        private string GetInstancePath(string app, string org)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\", org + @"\", app + @"\");
        }
    }
}
