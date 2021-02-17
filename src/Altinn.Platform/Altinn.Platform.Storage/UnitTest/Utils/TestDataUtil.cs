using System;
using System.IO;

using Altinn.Platform.Storage.Interface.Models;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.UnitTest.Utils
{
    public class TestDataUtil
    {
        public static readonly object DataLock = new object();

        public static Instance GetInstance(int instanceOwnerId, Guid instanceGuid)
        {
            string path = GetInstancePath(instanceOwnerId, instanceGuid);
            if (!File.Exists(path))
            {
                return null;
            }

            string content = File.ReadAllText(path);
            Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
            return instance;
        }

        public static DataElement GetDataElement(string dataGuid)
        {
            string dataElementPath = GetDataPath() + "/" + dataGuid + ".json";

            string content = File.ReadAllText(dataElementPath);
            DataElement dataElement = (DataElement)JsonConvert.DeserializeObject(content, typeof(DataElement));
            return dataElement;
        }

        private static string GetInstancePath(int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(TestDataUtil).Assembly.Location).LocalPath);
            return Path.Combine(
                unitTestFolder,
                @"..\..\..\data\cosmoscollections\instances\",
                instanceOwnerId.ToString(),
                instanceGuid + @".json");
        }

        private static string GetDataPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(TestDataUtil).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\cosmoscollections\dataelements");
        }
    }
}
