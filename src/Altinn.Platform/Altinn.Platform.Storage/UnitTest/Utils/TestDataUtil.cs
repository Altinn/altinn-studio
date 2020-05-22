using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace Altinn.Platform.Storage.UnitTest.Utils
{
    public class TestDataUtil
    {
        public static readonly object dataLock = new object();

        public static void PrepareInstance(int instanceOwnerId, string instanceGuid)
        {
            PrepareInstance(instanceOwnerId, new Guid(instanceGuid));
        }

        public static void PrepareInstance(int instanceOwnerPartyId, Guid instanceGuid, string org = null, string app = null)
        {
            lock (dataLock)
            {

                string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);

                string preInstancePath = instancePath.Replace(".json", ".pretest.json");

                File.Copy(preInstancePath, instancePath);

                if (org != null && app != null)
                {
                    string blobPath = GetBlobPathForApp(org, app, instanceGuid.ToString());
                    if (Directory.Exists(blobPath + "pretest"))
                    {
                        DirectoryCopy(blobPath + "pretest", blobPath, true);
                    }
                }

                PrepereDataElements(instanceOwnerPartyId, instanceGuid);
            }
        }

        private static void PrepereDataElements(int instanceOwnerPartyId, Guid instanceGuid)
        {
             Instance instance = GetInstance(instanceOwnerPartyId, instanceGuid);

                string dataBlob = GetBlobPathForApp(instance.Org, instance.AppId.Split("/")[1], instanceGuid.ToString());

                // Copy blobs
                DirectoryCopy(dataBlob.Replace(instanceGuid.ToString(), "pretest" + instanceGuid), dataBlob, true);

               string dataElementsPath = GetDataElementsPath();


    
                string[] dataElementPaths = Directory.GetFiles(dataElementsPath);
                foreach (string elementPath in dataElementPaths)
                {
                    if (elementPath.Contains("pretest"))
                    {
                        string content = System.IO.File.ReadAllText(elementPath);
                        DataElement dataElement = (DataElement)JsonConvert.DeserializeObject(content, typeof(DataElement));
                        if (dataElement.InstanceGuid.Contains(instanceGuid.ToString()))
                        {
                            File.Copy(elementPath, elementPath.Replace(".pretest.json", ".json"));
                        }
                    }
                }
            
        }


        public static void DeleteInstance(int instanceOwnerId, Guid instanceGuid)
        {
            lock (dataLock)
            {
                string instancePath = GetInstancePath(instanceOwnerId, instanceGuid);
                if (File.Exists(instancePath))
                {
                    File.Delete(instancePath);
                }
            }
        }

        public static void DeleteInstanceAndDataAndBlobs(int instanceOwnerPartyId, string instanceguid, string org, string app)
        {
            lock (dataLock)
            {
                DeleteInstanceAndData(instanceOwnerPartyId, new Guid(instanceguid));
            }
        }

        public static void DeleteInstanceAndData(int instanceOwnerPartyId, string instanceguid)
        {
            lock (dataLock)
            {
                DeleteInstanceAndData(instanceOwnerPartyId, new Guid(instanceguid));
            }
        }

        public static void DeleteInstanceAndData(int instanceOwnerPartyId, Guid instanceGuid)
        {
            lock (dataLock)
            {
                DeleteDataForInstance(instanceOwnerPartyId, instanceGuid);
                DeleteInstanceEVents(instanceGuid);
                string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);
                if (File.Exists(instancePath))
                {
                    File.Delete(instancePath);
                }
            }
        }

        public static void DeleteInstanceEVents(Guid instanceGuid)
        {
            string eventsPath = GetInstanceEventsPath();
            if (Directory.Exists(eventsPath))
            {
                string[] instanceEventPath = Directory.GetFiles(eventsPath);
                foreach (string path in instanceEventPath)
                {
                    string content = System.IO.File.ReadAllText(path);
                    InstanceEvent instance = (InstanceEvent)JsonConvert.DeserializeObject(content, typeof(InstanceEvent));
                    if (instance.InstanceId.Contains(instanceGuid.ToString()))
                    {
                        File.Delete(path);
                    }
                }
            }

        }



        public static void DeleteDataForInstance(int instanceOwnerId, Guid instanceGuid)
        {
            Instance instance = GetInstance(instanceOwnerId, instanceGuid);

            if (instance != null)
            {
                string eventsPath = GetDataElementsPath();
                if (Directory.Exists(eventsPath))
                {
                    string[] dataElementsPaths = Directory.GetFiles(eventsPath);
                    foreach (string elementPath in dataElementsPaths)
                    {
                        if (!elementPath.Contains("pretest"))
                        {
                            string content = System.IO.File.ReadAllText(elementPath);
                            DataElement dataElement = (DataElement)JsonConvert.DeserializeObject(content, typeof(DataElement));
                            if (dataElement.InstanceGuid.Contains(instanceGuid.ToString()))
                            {
                                string blobPath = GetBlobPathForApp(instance.Org, instance.AppId.Split("/")[1], instanceGuid.ToString()) + dataElement.Id;
                                if (File.Exists(blobPath))
                                {
                                    File.Delete(blobPath);
                                }

                                if (File.Exists(elementPath))
                                {
                                    File.Delete(elementPath);
                                }
                            }
                        }
                    }
                }
            }
        }

        public static Instance GetInstance(int instanceOwnerId, Guid instanceGuid)
        {
            string path = GetInstancePath(instanceOwnerId, instanceGuid);
            if(!File.Exists(path))
            {
                return null;
            }

            string content = System.IO.File.ReadAllText(path);
            Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
            return instance;
        }

        private static string GetInstancePath(int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(TestDataUtil).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\cosmoscollections\instances\", instanceOwnerId.ToString() ,instanceGuid.ToString() + @".json");
        }

        private static string GetDataPath(int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(TestDataUtil).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\cosmoscollections\dataelements", instanceOwnerId + @"\", instanceGuid.ToString());
        }

        private static string GetBlobPathForApp(string org, string app, string instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(TestDataUtil).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\blob\", org + @"\", app + @"\", instanceGuid + @"\data\");
        }

        private static void DirectoryCopy(string sourceDirName, string destDirName, bool copySubDirs)
        {
    
            // Get the subdirectories for the specified directory.
            DirectoryInfo dir = new DirectoryInfo(sourceDirName);

            if (!dir.Exists)
            {
                return;
            }

            DirectoryInfo[] dirs = dir.GetDirectories();
            // If the destination directory doesn't exist, create it.
            if (!Directory.Exists(destDirName))
            {
                Directory.CreateDirectory(destDirName);
            }

            // Get the files in the directory and copy them to the new location.
            FileInfo[] files = dir.GetFiles();
            foreach (FileInfo file in files)
            {
                string temppath = Path.Combine(destDirName, file.Name);
                file.CopyTo(temppath, false);
            }

            // If copying subdirectories, copy them and their contents to new location.
            if (copySubDirs)
            {
                foreach (DirectoryInfo subdir in dirs)
                {
                    string temppath = Path.Combine(destDirName, subdir.Name);
                    DirectoryCopy(subdir.FullName, temppath, copySubDirs);
                }
            }
        }

        private static string GetInstanceEventsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(TestDataUtil).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\cosmoscollections\instanceEvents\");
        }

        private static string GetDataElementsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(TestDataUtil).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\cosmoscollections\dataelements\");
        }
    }
}
