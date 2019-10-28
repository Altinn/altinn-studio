using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Models;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
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

        public object GetFormData(Guid instanceGuid, Type type, string org, string app, int instanceOwnerId, Guid dataId)
        {
            throw new NotImplementedException();
        }

        public Task<DataElement> InsertBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, string attachmentType, string attachmentName, HttpRequest request)
        {
            throw new NotImplementedException();
        }

        public async Task<Instance> InsertFormData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerId)
        {
            Guid dataGuid = Guid.NewGuid();
            string dataPath = GetDataPath(org, app, instanceOwnerId, instanceGuid);

            Instance instance = GetTestInstance(app, org, instanceOwnerId, instanceGuid);

            DataElement dataElement = new DataElement() { Id = dataGuid.ToString(), ElementType = "default" };
           
            try
            {

                Directory.CreateDirectory(dataPath + @"blob");

                using (Stream stream = File.Open(dataPath + @"blob\" + dataGuid.ToString() + ".xml" , FileMode.Create, FileAccess.ReadWrite))
                {
                    XmlSerializer serializer = new XmlSerializer(type);
                    serializer.Serialize(stream, dataToSerialize);
                }

                string jsonData = JsonConvert.SerializeObject(dataElement);
                using (StreamWriter sw = new StreamWriter(dataPath + dataGuid.ToString() + @".json"))
                {
                    sw.Write(jsonData.ToString());
                    sw.Close();
                }
            }
            catch (Exception ex)
            {
            }
            
            instance.Data = GetDataElements(org, app, instanceOwnerId, instanceGuid);

            return instance;
        }



        
        public Task<DataElement> UpdateBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid, HttpRequest request)
        {
            throw new NotImplementedException();
        }

        public Task<Instance> UpdateData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerId, Guid dataId)
        {
            throw new NotImplementedException();
        }

        private string GetDataPath(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\",org + @"\", app + @"\", instanceOwnerId + @"\", instanceGuid.ToString() + @"\");
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
    }
}
