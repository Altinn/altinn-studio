using System;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.Designer.Configuration;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Designer.Tests.Utils
{
    public static class TestDataHelper
    {
        public static JsonSchema LoadDataFromEmbeddedResourceAsJsonSchema(string resourceName)
        {
            var resourceStream = LoadDataFromEmbeddedResource(resourceName);

            using StreamReader streamReader = new StreamReader(resourceStream);
            JsonValue jsonValue = JsonValue.Parse(streamReader);
            return new JsonSerializer().Deserialize<JsonSchema>(jsonValue);
        }

        public static string LoadDataFromEmbeddedResourceAsString(string resourceName)
        {
            var resourceStream = LoadDataFromEmbeddedResource(resourceName);

            using StreamReader reader = new StreamReader(resourceStream);
            string text = reader.ReadToEnd();

            return text;
        }

        public static Stream LoadDataFromEmbeddedResource(string resourceName)
        {
            var assembly = Assembly.GetExecutingAssembly();
            Stream resourceStream = assembly.GetManifestResourceStream(resourceName);

            if (resourceStream == null)
            {
                throw new InvalidOperationException("Unable to find test data embedded in the test assembly.");
            }

            resourceStream.Seek(0, SeekOrigin.Begin);

            return resourceStream;
        }

        public static Stream LoadTestDataFromFile(string resourceName)
        {
            var assembly = Assembly.GetExecutingAssembly();
            string unitTestFolder = Path.GetDirectoryName(new Uri(assembly.Location).LocalPath);
            string testDataFile = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", resourceName);
            Stream resource = File.OpenRead(testDataFile);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data.");
            }

            return resource;
        }

        public static string LoadTestDataFromFileAsString(string resourceName)
        {
            var resourceStream = LoadTestDataFromFile(resourceName);

            using StreamReader reader = new StreamReader(resourceStream);
            string text = reader.ReadToEnd();

            return text;
        }

        public static XmlSchema LoadXmlSchemaTestData(string resourceName)
        {
            using XmlReader xmlReader = XmlReader.Create(LoadTestData(resourceName));
            var xmlSchema = XmlSchema.Read(xmlReader, (_, _) => { });

            var schemaSet = new XmlSchemaSet();
            schemaSet.Add(xmlSchema);
            schemaSet.Compile();

            return xmlSchema;
        }

        public static Stream LoadTestData(string resourceName)
        {
            string unitTestFolder = GetTestDataDirectory();
            Stream resource = File.OpenRead(Path.Combine(unitTestFolder, resourceName));

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data.");
            }

            return resource;
        }

        public static string GetTestDataDirectory()
        {
            var unitTestFolder = Path.GetDirectoryName(new Uri(Assembly.GetExecutingAssembly().Location).LocalPath);
            return Path.GetFullPath(Path.Combine(unitTestFolder, "..", "..", "..", "_TestData")) + Path.DirectorySeparatorChar;
        }

        public static string GetTestDataRepositoriesRootDirectory()
        {
            var unitTestFolder = GetTestDataDirectory();
            return Path.Combine(unitTestFolder, "Repositories") + Path.DirectorySeparatorChar;
        }

        public static string GetTestDataRepositoryDirectory(string org, string repository, string developer)
        {
            var repositoriesRootDirectory = GetTestDataRepositoriesRootDirectory();
            return Path.Combine(repositoriesRootDirectory, developer, org, repository);
        }

        public static string GetTestDataRemoteRepositoryRootDirectory()
        {
            var unitTestFolder = GetTestDataDirectory();
            return Path.Combine(unitTestFolder, $"Remote");
        }

        public static string GetTestDataRemoteRepository(string org, string repository)
        {
            var remoteRepositoryRootDirectory = GetTestDataRemoteRepositoryRootDirectory();
            return Path.Combine(remoteRepositoryRootDirectory, org, repository);
        }

        public async static Task<string> CopyRepositoryForTest(string org, string repository, string developer, string targetRepsository)
        {
            var sourceAppRepository = GetTestDataRepositoryDirectory(org, repository, developer);
            var targetDirectory = Path.Combine(GetTestDataRepositoriesRootDirectory(), developer, org, targetRepsository);

            await CopyDirectory(sourceAppRepository, targetDirectory);

            return targetDirectory;
        }

        public static void DeleteAppRepository(string org, string repository, string developer)
        {
            var repositoryDirectory = GetTestDataRepositoryDirectory(org, repository, developer);
            DeleteDirectory(repositoryDirectory);
        }

        public static void DeleteDirectory(string directoryToDelete, bool deleteSubDirs = true)
        {
            DirectoryInfo directoryToDeleteInfo = new DirectoryInfo(directoryToDelete);

            if (!directoryToDeleteInfo.Exists)
            {
                throw new DirectoryNotFoundException($"Directory does not exist or could not be found: {directoryToDelete}");
            }

            DirectoryInfo[] subDirectories = directoryToDeleteInfo.GetDirectories();

            FileInfo[] files = directoryToDeleteInfo.GetFiles();
            foreach (FileInfo file in files)
            {
                DeleteFileWithRetry(file.FullName);
            }

            if (deleteSubDirs)
            {
                foreach (DirectoryInfo directory in subDirectories)
                {
                    DeleteDirectory(directory.FullName);
                }
            }

            Directory.Delete(directoryToDeleteInfo.FullName);
        }

        private static void DeleteFileWithRetry(string filePath, int retries = 3, int waitTimeMs = 100)
        {
            int attempt = 1;
            while (attempt <= retries)
            {
                try
                {
                    File.Delete(filePath);
                }
                catch (IOException)
                {
                    if (attempt == retries)
                    {
                        throw;
                    }

                    Thread.Sleep(waitTimeMs);
                }

                attempt++;
            }
        }

        public static string CreateEmptyDirectory(string path)
        {
            string fullPath = Path.Combine(GetTestDataRepositoriesRootDirectory(), path);
            Directory.CreateDirectory(fullPath);

            return fullPath;
        }

        public static string CreateEmptyRepositoryForTest(string org, string repository, string developer)
        {
            var repositoriesRootDirectory = GetTestDataRepositoriesRootDirectory();
            var repositoryDirectory = Path.Combine(repositoriesRootDirectory, developer, org, repository);
            Directory.CreateDirectory(repositoryDirectory);

            return repositoryDirectory;
        }

        public async static Task CopyDirectory(string sourceDirectory, string targetDirectory, bool copySubDirs = true)
        {
            DirectoryInfo sourceDirectoryInfo = new DirectoryInfo(sourceDirectory);

            if (!sourceDirectoryInfo.Exists)
            {
                throw new DirectoryNotFoundException($"Source directory does not exist or could not be found: {sourceDirectory}");
            }

            DirectoryInfo[] sourceSubDirectories = sourceDirectoryInfo.GetDirectories();

            Directory.CreateDirectory(targetDirectory);

            FileInfo[] files = sourceDirectoryInfo.GetFiles();
            foreach (FileInfo file in files)
            {
                string tempPath = Path.Combine(targetDirectory, file.Name);

                var sourceBytes = ReadAllBytesWithoutLockingWithRetry(file.FullName);
                await File.WriteAllBytesAsync(tempPath, sourceBytes);
                File.SetAttributes(tempPath, FileAttributes.Normal);
            }

            if (copySubDirs)
            {
                foreach (DirectoryInfo subdir in sourceSubDirectories)
                {
                    string tempPath = Path.Combine(targetDirectory, subdir.Name);
                    await CopyDirectory(subdir.FullName, tempPath, copySubDirs);
                }
            }
        }

        public static void CleanUpRemoteRepository(string org, string repository)
        {
            string dir = Path.Combine(GetTestDataRemoteRepositoryRootDirectory(), org);

            foreach (string subDir in Directory.GetDirectories(dir))
            {
                if (subDir.Contains($"{repository}_branch") || subDir.Equals(Path.Combine(dir, repository)))
                {
                    DeleteDirectory(subDir, true);
                }
            }
        }

        public static async Task CleanUpReplacedRepositories(string org, string repository, string developer)
        {
            string dir = Path.Combine(GetTestDataRepositoriesRootDirectory(), developer, org);

            foreach (string subDir in Directory.GetDirectories(dir))
            {
                if (subDir.Contains($"{repository}_REPLACED_BY_NEW_CLONE_"))
                {
                    // move data and delete copied folder
                    string originalPath = GetTestDataRepositoryDirectory(org, repository, developer);
                    await CopyDirectory(subDir, originalPath, true);
                    Directory.Delete(subDir, true);
                }
            }
        }

        public static void CleanUpLocalBranches(string org, string repository, string developer)
        {
            string dir = Path.Combine(GetTestDataRepositoriesRootDirectory(), developer, org);

            foreach (string subDir in Directory.GetDirectories(dir))
            {
                if (subDir.Contains($"{repository}_complete_copy_of_app"))
                {
                    Directory.Delete(subDir, true);
                }
            }
        }

        public static string GetFileFromRepo(string org, string repository, string developer, string relativePath)
        {
            string filePath = Path.Combine(GetTestDataRepositoryDirectory(org, repository, developer), relativePath);
            if (File.Exists(filePath))
            {
                return File.ReadAllText(filePath);
            }

            return string.Empty;
        }

        public static ILogger<T> CreateLogger<T>() => LogFactory.CreateLogger<T>();

        public static ILoggerFactory LogFactory { get; } = LoggerFactory.Create(builder =>
        {
            builder.ClearProviders();
            builder
                .AddSimpleConsole(options =>
                {
                    options.IncludeScopes = true;
                    options.TimestampFormat = "hh:mm:ss ";
                });
        });

        public static IOptions<ServiceRepositorySettings> GetServiceRepositorySettings()
        {
            IOptions<ServiceRepositorySettings> options = Options.Create(new ServiceRepositorySettings());
            options.Value.RepositoryBaseURL = @"http://altinn3.no/repos";
            return options;
        }

        public static IOptions<ServiceRepositorySettings> ServiceRepositorySettings { get; } = GetServiceRepositorySettings();

        /// <summary>
        /// File.ReadAllBytes alternative to avoid read and/or write locking
        /// </summary>
        private static byte[] ReadAllBytesWithoutLocking(string filePath, FileAccess fileAccess = FileAccess.Read, FileShare shareMode = FileShare.ReadWrite)
        {
            using (var fs = new FileStream(filePath, FileMode.Open, fileAccess, shareMode))
            {
                using (var ms = new MemoryStream())
                {
                    fs.CopyTo(ms);
                    return ms.ToArray();
                }
            }
        }

        /// <summary>
        /// Same method as <see cref="ReadAllBytesWithoutLocking(string, FileAccess, FileShare)"/> but with retries in case some other process has a lock on the file.
        /// </summary>
        private static byte[] ReadAllBytesWithoutLockingWithRetry(string filePath, FileAccess fileAccess = FileAccess.Read, FileShare shareMode = FileShare.ReadWrite, int retries = 3, int waitTimeMs = 100)
        {
            byte[] bytes = Array.Empty<byte>();
            int attempt = 1;
            while (attempt <= retries)
            {
                try
                {
                    bytes = ReadAllBytesWithoutLocking(filePath, fileAccess, shareMode);
                }
                catch (IOException)
                {
                    if (attempt == retries)
                    {
                        throw;
                    }

                    Thread.Sleep(waitTimeMs);
                }

                attempt++;
            }

            return bytes;
        }
    }
}
