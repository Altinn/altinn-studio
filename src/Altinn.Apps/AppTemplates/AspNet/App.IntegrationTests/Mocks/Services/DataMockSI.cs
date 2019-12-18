using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Xml.Serialization;

namespace App.IntegrationTests.Mocks.Services
{
    public class DataMockSI : IData
    {

        public DataMockSI()
        {
     
        }

        public Task<bool> DeleteBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
        {
            throw new NotImplementedException();
        }

        public Task<Stream> GetBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataId)
        {
            throw new NotImplementedException();
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
                using FileStream SourceStream = File.Open(dataPath, FileMode.OpenOrCreate);
                
                return serializer.Deserialize(SourceStream);                
            }
            catch
            {
                return Activator.CreateInstance(type);
            }
        }

        public Task<DataElement> InsertBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, string dataType, HttpRequest request)
        {
            throw new NotImplementedException();
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
            throw new NotImplementedException();
        }

        private string GetDataPath(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\",org + @"\", app + @"\", instanceOwnerId + @"\", instanceGuid.ToString() + @"\");
        }

        private string GetDataBlobPath(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\", org + @"\", app + @"\", instanceOwnerId + @"\", instanceGuid.ToString() + @"\blob\" + dataId.ToString());
        }

        private Instance GetTestInstance(string app, string org, int instanceOwnerId, Guid instanceId)
        {
            string instancePath = Path.Combine(GetInstancePath(), org + @"\" + app + @"\" + instanceOwnerId + @"\" + instanceId.ToString() + ".json");
            if (File.Exists(instancePath))
            {
                string content = System.IO.File.ReadAllText(instancePath);
                Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                return instance;
            }
            return null;
        }

        private string GetInstancePath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances");
        }

        private List<DataElement> GetDataElements(string org, string app, int instanceOwnerId, Guid instanceId)
        {
            string path = GetDataPath(org, app, instanceOwnerId, instanceId);
            List<DataElement> dataElements = new List<DataElement>();

            string[] files = Directory.GetFiles(path);

            foreach (string file in files)
            {
                string content = System.IO.File.ReadAllText(Path.Combine(path,file));
                DataElement dataElement = (DataElement)JsonConvert.DeserializeObject(content, typeof(DataElement));
                dataElements.Add(dataElement);
            }

            return dataElements;
        }

        public Task<DataElement> InsertBinaryData(string instanceId, string dataType, string contentType, string filename, Stream stream)
        {
            throw new NotImplementedException();
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
    }
}
