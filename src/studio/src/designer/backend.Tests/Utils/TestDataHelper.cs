using System;
using System.Configuration;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
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
            unitTestFolder = Path.Combine(unitTestFolder, @"..\..\..\_TestData\");
            Stream resource = File.OpenRead(unitTestFolder + resourceName);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data.");
            }

            return resource;
        }

        public static string GetTestDataDirectory()
        {
            var unitTestFolder = Path.GetDirectoryName(new Uri(Assembly.GetExecutingAssembly().Location).LocalPath);
            return Path.GetFullPath(Path.Combine(unitTestFolder, @"..\..\..\_TestData\"));
        }

        public static string GetTestDataRepositoriesRootDirectory()
        {
            var unitTestFolder = GetTestDataDirectory();
            return Path.Combine(unitTestFolder, @"Repositories\");
        }

        public static string GetTestDataRepositoryDirectory(string org, string repository, string developer)
        {
            var unitTestFolder = GetTestDataDirectory();
            return Path.Combine(unitTestFolder, $"Repositories\\{developer}\\{org}\\{repository}");
        }

        public static string GetTestDataRemoteRepository(string org, string repository)
        {
            var unitTestFolder = GetTestDataDirectory();
            return Path.Combine(unitTestFolder, $"Remote\\{org}\\{repository}");
        }

        public static string GetTestDataRemoteRepositoryRootDirectory()
        {
            var unitTestFolder = GetTestDataDirectory();
            return Path.Combine(unitTestFolder, $"Remote");
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
                File.Delete(file.FullName);
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

        public static string CreateEmptyDirectory(string path)
        {
            string fullPath = $"{GetTestDataRepositoriesRootDirectory()}/{path}";
            Directory.CreateDirectory(fullPath);
            return fullPath;
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

                var sourceBytes = ReadAllBytesWithoutLocking(file.FullName);
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
            string dir = Path.Combine(GetTestDataRemoteRepositoryRootDirectory(), $"{org}\\");

            foreach (string subDir in Directory.GetDirectories(dir))
            {
                if (subDir.Contains($"{repository}_branch") || subDir.Equals(Path.Combine(dir, repository)))
                {
                    DeleteDirectory(subDir, true);
                }
            }
        }

        public static void CleanUpReplacedRepositories(string org, string repository, string developer)
        {
            string dir = Path.Combine(GetTestDataRepositoriesRootDirectory(), $"{developer}\\{org}\\");

            foreach (string subDir in Directory.GetDirectories(dir))
            {
                if (subDir.Contains($"{repository}_REPLACED_BY_NEW_CLONE_"))
                {
                    // move data and delete copied folder
                    string originalPath = GetTestDataRepositoryDirectory(org, repository, developer);
                    CopyDirectory(subDir, originalPath, true);
                    Directory.Delete(subDir, true);
                }
            }
        }

        public static void CleanUpLocalBranches(string org, string repository, string developer)
        {
            string dir = Path.Combine(GetTestDataRepositoriesRootDirectory(), $"{developer}\\{org}\\");

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
            options.Value.RepositoryBaseURL = @"http://local.altinn.studio/repos";
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
    }
}
