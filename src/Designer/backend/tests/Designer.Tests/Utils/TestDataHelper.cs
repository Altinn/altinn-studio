using System;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Csharp;
using Altinn.Studio.DataModeling.Converter.Interfaces;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.Designer.Configuration;

using Microsoft.Extensions.Logging;

namespace Designer.Tests.Utils
{
    public static class TestDataHelper
    {

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
            return Path.Combine(unitTestFolder, "Remote");
        }

        public static string GetTestDataRemoteRepository(string org, string repository)
        {
            var remoteRepositoryRootDirectory = GetTestDataRemoteRepositoryRootDirectory();
            return Path.Combine(remoteRepositoryRootDirectory, org, repository);
        }

        /// <summary>
        /// Generates test repository name that will be excluded from project and will be git ignored.
        /// </summary>
        /// <param name="suffix">If provided appends suffix to test repo.</param>
        /// <param name="length">Define length of the repo name.</param>
        /// <returns>Test repository name.</returns>
        public static string GenerateTestRepoName(string suffix = null, int length = 28)
        {
            if (suffix?.Length > 15)
            {
                throw new ArgumentException("Suffix is too long");
            }
            if (length is < 12 or > 28)
            {
                throw new ArgumentException("Length for test repo must be between 12 and 28.");
            }

            if ("test-repo-".Length + suffix?.Length > length)
            {
                throw new ArgumentException("Suffix is too long");
            }

            string nonSuffixName = $"test-repo-{Guid.NewGuid()}"[..length];

            return suffix == null ? nonSuffixName : $"{nonSuffixName[..^suffix.Length]}{suffix}";
        }

        public static async Task<string> CopyRepositoryForTest(string org, string repository, string developer, string targetRepository)
        {
            var sourceAppRepository = GetTestDataRepositoryDirectory(org, repository, developer);
            var targetDirectory = Path.Combine(GetTestDataRepositoriesRootDirectory(), developer, org, targetRepository);

            await CopyDirectory(sourceAppRepository, targetDirectory);

            return targetDirectory;
        }

        public static async Task<string> CopyRemoteRepositoryForTest(string org, string repository, string targetRepository)
        {
            var sourceRemoteRepository = GetTestDataRemoteRepository(org, repository);
            var targetDirectory = Path.Combine(GetTestDataRemoteRepositoryRootDirectory(), org, targetRepository);

            await CopyDirectory(sourceRemoteRepository, targetDirectory);

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

        public static async Task CopyDirectory(string sourceDirectory, string targetDirectory, bool copySubDirs = true)
        {
            DirectoryInfo sourceDirectoryInfo = new DirectoryInfo(sourceDirectory);

            if (!sourceDirectoryInfo.Exists)
            {
                throw new DirectoryNotFoundException($"Source directory does not exist or could not be found: {sourceDirectory}");
            }

            DirectoryInfo[] sourceSubDirectories = sourceDirectoryInfo.GetDirectories();

            Directory.CreateDirectory(targetDirectory);

            FileInfo[] files = sourceDirectoryInfo.GetFiles();
            await Parallel.ForEachAsync(files, async (file, _) =>
            {
                string tempPath = Path.Combine(targetDirectory, file.Name);
                await CopyFileIfNotExistsAsync(file, tempPath);
            });

            if (copySubDirs)
            {
                await Parallel.ForEachAsync(sourceSubDirectories, async (subDir, _) =>
                {
                    string tempPath = Path.Combine(targetDirectory, subDir.Name);
                    await CopyDirectory(subDir.FullName, tempPath, copySubDirs);
                });
            }
        }

        // Copy file using Streams for better performance
        private static async Task CopyFileIfNotExistsAsync(FileInfo file, string destinationPath)
        {
            if (File.Exists(destinationPath))
            {
                return;
            }
            await using FileStream sourceStream = file.OpenRead();
            await using FileStream destinationStream = File.Create(destinationPath, bufferSize: 4096, FileOptions.Asynchronous);
            await sourceStream.CopyToAsync(destinationStream, bufferSize: 4096);
            File.SetAttributes(destinationPath, FileAttributes.Normal);
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

        public static byte[] GetFileAsByteArrayFromRepo(string org, string repository, string developer, string relativePath)
        {
            string filePath = Path.Combine(GetTestDataRepositoryDirectory(org, repository, developer), relativePath);
            if (File.Exists(filePath))
            {
                return File.ReadAllBytes(filePath);
            }

            return new byte[0];
        }

        public static string GetFileAsBase64StringFromRepo(string org, string repository, string developer, string relativePath)
        {
            byte[] fileBytes = GetFileAsByteArrayFromRepo(org, repository, developer, relativePath);
            return Convert.ToBase64String(fileBytes);
        }

        public static bool FileExistsInRepo(string org, string repository, string developer, string relativePath)
        {
            string filePath = Path.Combine(GetTestDataRepositoryDirectory(org, repository, developer), relativePath);
            return File.Exists(filePath);
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

        public static ServiceRepositorySettings GetServiceRepositorySettings()
        {
            var options = new ServiceRepositorySettings()
            {
                RepositoryBaseURL = @"http://studio.localhost/repos"
            };

            return options;
        }

        public static ServiceRepositorySettings ServiceRepositorySettings { get; } = GetServiceRepositorySettings();

        public static IXmlSchemaToJsonSchemaConverter XmlSchemaToJsonSchemaConverter => new XmlSchemaToJsonSchemaConverter();

        public static IJsonSchemaToXmlSchemaConverter JsonSchemaToXmlSchemaConverter => new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());

        public static IModelMetadataToCsharpConverter ModelMetadataToCsharpConverter => new JsonMetadataToCsharpConverter(new CSharpGenerationSettings());

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

        public static string GenerateTestOrgName(int length = 27)
        {
            if (length is < 12 or > 27)
            {
                throw new ArgumentException("Length for test org must be between 12 and 27.");
            }

            return $"test-org-{Guid.NewGuid()}"[..length];
        }

        public static string GetOrgContentRepoName(string org)
        {
            return $"{org}-content";
        }

        public static async Task<string> CopyOrgForTest(string developer, string org, string repository, string targetOrg, string targetRepository)
        {
            string sourceDirectory = GetRepositoryDirectory(developer, org, repository);
            string targetOrgDirectory = GetOrgDirectory(targetOrg, developer);
            string targetRepoDirectory = GetRepositoryDirectory(developer, targetOrg, targetRepository);

            CreateEmptyDirectory(targetOrgDirectory);
            await CopyDirectory(sourceDirectory, targetRepoDirectory);

            return targetOrgDirectory;
        }

        public static async Task AddRepositoryToTestOrg(string developer, string org, string repository, string targetOrg, string targetRepository)
        {
            string sourceDirectory = GetRepositoryDirectory(developer, org, repository);
            string targetRepoDirectory = GetRepositoryDirectory(developer, targetOrg, targetRepository);

            await CopyDirectory(sourceDirectory, targetRepoDirectory);
        }

        private static string GetOrgDirectory(string org, string developer)
        {
            return Path.Join(GetTestDataRepositoriesRootDirectory(), developer, org);
        }

        public static string GetRepositoryDirectory(string developer, string org, string repository)
        {
            return Path.Join(GetTestDataRepositoriesRootDirectory(), developer, org, repository);
        }

        public static string[] GetRepositoryFileNames(string developer, string org, string repository, string searchPattern)
        {
            return Directory.GetFiles(GetRepositoryDirectory(developer, org, repository), searchPattern);
        }

        public static void DeleteOrgDirectory(string developer, string org)
        {
            string orgRepositoryDirectory = GetOrgDirectory(org, developer);
            DeleteDirectory(orgRepositoryDirectory);
        }
    }
}
