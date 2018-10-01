using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.FileProviders.Physical;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;

namespace AltinnCore.Common.Backend
{
    /// <summary>
    /// Struct for ChangeToken
    /// </summary>
    public struct ChangeTokenInfo
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ChangeTokenInfo"/> struct 
        /// </summary>
        /// <param name="tokenSource">The tokenSource</param>
        /// <param name="changeToken">The changeToken</param>
        public ChangeTokenInfo(
            CancellationTokenSource tokenSource,
            CancellationChangeToken changeToken)
        {
            TokenSource = tokenSource;
            ChangeToken = changeToken;
        }

        /// <summary>
        /// Gets The Token Source
        /// </summary>
        public CancellationTokenSource TokenSource { get; }

        /// <summary>
        /// Gets The Cancellation Change Token
        /// </summary>
        public CancellationChangeToken ChangeToken { get; }
    }

    /// <summary>
    /// This is the file provider used to retrieve the Razor Views from data store for services
    /// </summary>
    public class AltinnViewFileProvider : IDisposable, IFileProvider 
    {
        private const string PollingEnvironmentKey = "DOTNET_USE_POLLING_FILE_WATCHER";

        private static readonly char[] InvalidFileNameChars = Path.GetInvalidFileNameChars()
            .Where(c => c != Path.DirectorySeparatorChar && c != Path.AltDirectorySeparatorChar).ToArray();

        private static readonly char[] PathSeparators = new[] { Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar };

        private string _viewName;

        private int _serviceInstanceId;

        private string _org;

        private string _service;

        private string _edition;

        private string _viewLocation;

        private string _packageLocation;

        private bool _usePackage;

        private string _repositoryLocation;

        /// <summary>
        /// Initializes a new instance of the <see cref="AltinnViewFileProvider"/> class
        /// </summary>
        /// <param name="viewLocation">The View Location</param>
        /// <param name="packageLocation">The Package location</param>
        /// <param name="repositoryLocation">The repository location</param>
        /// <param name="usePackage">Defines if view are retrieved from packages locally</param>
        public AltinnViewFileProvider(string viewLocation, string packageLocation, string repositoryLocation, bool usePackage)
        {
            _viewLocation = viewLocation;
            _packageLocation = packageLocation;
            _usePackage = usePackage;
            _repositoryLocation = repositoryLocation;
        }

        /// <summary>
        /// Disposes the FileProvider
        /// </summary>
        public void Dispose()
        {
        }

        /// <summary>
        /// Locate a file at the given path by directly mapping path segments to physical directories.
        /// </summary>
        /// <param name="subpath">A path under the root directory</param>
        /// <returns>The file information. Caller must check Exists property. </returns>
        public IFileInfo GetFileInfo(string subpath)
        {
            // Relative paths starting with a leading slash okay
            if (subpath.StartsWith("/", StringComparison.Ordinal))
            {
                subpath = subpath.Substring(1);
            }

            if (!IsServicePath(subpath))
            {
                return new NotFoundFileInfo(subpath);
            }

            PopulateServiceVariables(subpath);

            ServiceViewFileInfo fileInfo = GetServiceViewFileInfo(_org, _service, _edition, _viewName);

            if (fileInfo == null)
            {
                return new NotFoundFileInfo(subpath);
            }

            return fileInfo;
        }

        /// <summary>
        /// Enumerate a directory at the given path, if any.
        /// </summary>
        /// <param name="subpath">A path under the root directory</param>
        /// <returns>Contents of the directory. Caller must check Exists property.</returns>
        public IDirectoryContents GetDirectoryContents(string subpath)
        {
            return new NotFoundDirectoryContents();
        }

        /// <summary>
        /// Watch method that verifies if file has changed since last time
        /// </summary>
        /// <param name="filter">Filter (filename)</param>
        /// <returns>Return a IChangeToken that can be used to verify if file has changed (need to recompile)</returns>
        public IChangeToken Watch(string filter)
        {
            if (filter.StartsWith("/", StringComparison.Ordinal))
            {
                filter = filter.Substring(1);
            }

            if (!IsServicePath(filter))
            {
                return null;
            }

            PopulateServiceVariables(filter);

            string physicalPath = GetPhysicalPath(_org, _service, _edition, _viewName);
            string packagePath = string.Empty;

            if (_usePackage)
            {
                packagePath = GetServicePackage(_org, _service, _edition);
            }
        
            if (physicalPath == null)
            {
                return null;
            }

            if (!string.IsNullOrEmpty(packagePath))
            {
                // Look at package, not at file content in package. 
                physicalPath = packagePath;
            }

            if (!_usePackage)
            {
                return new ServDevViewFileChangeToken(GetServicePath(_org, _service, _edition), _viewName); 
             }
            else
            {
                return new PhysicalServicePackageChangeToken(packagePath, _viewName);
            }
        }

        private static string EnsureTrailingSlash(string path)
        {
            if (!string.IsNullOrEmpty(path) &&
                path[path.Length - 1] != Path.DirectorySeparatorChar)
            {
                return path + Path.DirectorySeparatorChar;
            }

            return path;
        }

        private static bool HasInvalidPathChars(string path)
        {
            return path.IndexOfAny(InvalidFileNameChars) != -1;
        }

        private PhysicalFilesWatcher CreateFileWatcher(string viewLocation)
        {
            var environmentValue = Environment.GetEnvironmentVariable(PollingEnvironmentKey);
            var pollForChanges = string.Equals(environmentValue, "1", StringComparison.Ordinal) ||
                string.Equals(environmentValue, "true", StringComparison.OrdinalIgnoreCase);

            viewLocation = EnsureTrailingSlash(Path.GetFullPath(viewLocation));
            return new PhysicalFilesWatcher(viewLocation, new FileSystemWatcher(viewLocation), pollForChanges);
        }

        private ServiceViewFileInfo GetServiceViewFileInfo(string org, string service, string edition, string viewName)
        {
            string physicalPath = GetPhysicalPath(org, service, edition, viewName);
            string packagePath = string.Empty;

            if (_usePackage)
            {
                packagePath = GetServicePackage(org, service, edition);
            }
            
            if (physicalPath == null)
            {
                return null;
            }

            var fileInfo = new ServiceViewFileInfo(physicalPath, packagePath)
            {
                Name = _viewName
            };
            if (!fileInfo.Name.EndsWith(".cshtml"))
            {
                fileInfo.Name += ".cshtml";
            }
           
            return fileInfo;
        }

        private string GetPhysicalPath(string org, string service, string edition, string viewName)
        {
            string fullPath;
            if (_usePackage)
            {
                fullPath = viewName;
            }
            else
            {
              fullPath  = String.Format(_viewLocation, org, service, edition) + _viewName;
            }

            if (!fullPath.EndsWith(".cshtml"))
            {
                fullPath += ".cshtml";
            }

            if (!_usePackage && !File.Exists(fullPath))
            {
                return null;
            }

            //// Todo verify content of package
           
            return fullPath;
        }

        private void PopulateServiceVariables(string subpath)
        {
            string[] pathParts = subpath.Split('/');
            _serviceInstanceId = int.Parse(pathParts[1]);

            string[] serviceParts = pathParts[2].Split('_');
            _org = serviceParts[0];
            _service = serviceParts[1];
            _edition = serviceParts[2];
            _viewName = pathParts[3];
        }

        private bool IsServicePath(string subpath)
        {
            if (subpath.Split('/')[0].StartsWith("ServiceView") && subpath.Split('/').Length == 4)
            {
                return true;
            }

            return false;
        }
        
        private string GetServicePackage(string org, string service, string edition)
        {
            string packageName = GetActivePackage(org, service, edition);
            string packageDirectory = string.Format(_packageLocation, org, service, edition);

            return packageDirectory + packageName;
        }

        private string GetServicePath(string org, string service, string edition)
        {
            return string.Format(_repositoryLocation, org, service, edition);
        }

        private string GetActivePackage(string org, string service, string edition)
        {
            List<AltinnCore.ServiceLibrary.ServiceMetadata.ServicePackageDetails> servicePackages = GetServicePackages(org, service, edition);
            ServicePackageDetails servicePackage = servicePackages.OrderBy(s => s.CreatedDateTime).LastOrDefault();
            return servicePackage.PackageName;
        }

        private List<ServicePackageDetails> GetServicePackages(string org, string service, string edition)
        {
            List<ServicePackageDetails> packageDetails = new List<ServicePackageDetails>();
            string packageDirectory = string.Format(_packageLocation, org, service, edition);

            if (!Directory.Exists(packageDirectory))
            {
                return packageDetails;
            }

            foreach (string fileName in Directory.EnumerateFiles(packageDirectory))
            {
                ServicePackageDetails details = JsonConvert.DeserializeObject<ServicePackageDetails>(new StreamReader(ZipFile.OpenRead(fileName).Entries.First(e => e.Name == "ServicePackageDetails.json").Open()).ReadToEnd());
                details.PackageName = Path.GetFileName(fileName);
                packageDetails.Add(details);
            }

            return packageDetails;
        }
    }
    
    /// <summary>
    /// The serviceFileInfo class containing information about a given serviceView
    /// </summary>
    internal class ServiceViewFileInfo : IFileInfo
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ServiceViewFileInfo"/> class
        /// </summary>
        /// <param name="path">The path</param>
        /// <param name="package">The package</param>
        public ServiceViewFileInfo(string path, string package)
        {
            PhysicalPath = path;
            Package = package;
        }

        /// <summary>
        /// Gets or sets a value indicating whether the ServiceView exists
        /// </summary>
        public bool Exists { get; protected set; } = true;

        /// <summary>
        /// Gets a value indicating whether the File is a directory
        /// </summary>
        public bool IsDirectory
        {
            get;
        }

        /// <summary>
        /// Gets or sets Information about when the RazorView was last modified
        /// </summary>
        public DateTimeOffset LastModified
        {
            get; protected set;
        }

        /// <summary>
        /// Gets The length of the ServiceView
        /// </summary>
        public long Length
        {
            get
            {
                if (string.IsNullOrEmpty(Package))
                {
                    using (var fileStream = new FileStream(
                        PhysicalPath,
                        FileMode.Open,
                        FileAccess.Read,
                        FileShare.ReadWrite,
                        1024 * 64,
                        FileOptions.Asynchronous | FileOptions.SequentialScan))
                    {
                        return fileStream.Length;
                    }
                }
                else
                {
                    ZipArchive archive = ZipFile.OpenRead(Package);
                    using (var fileStream = new StreamReader(archive.Entries.First(e => e.Name == Name).Open()))
                    {
                        return fileStream.ReadToEnd().Length;
                    }
                }
            }
        }

        /// <summary>
        /// Gets or sets The name of the ServiceView (Razor file)
        /// </summary>
        public string Name
        {
            get; set;
        }

        /// <summary>
        /// Gets or sets The physical path of the ServiceView (Razor)
        /// </summary>
        public string PhysicalPath
        {
            get; set;
        }

        /// <summary>
        /// Gets or sets the Package Name of the Service View
        /// </summary>
        public string Package { get; set; }
        
        /// <summary>
        /// Returns a stream for the physical path of the service View
        /// </summary>
        /// <returns>The stream</returns>
        public Stream CreateReadStream()
        {
            if (string.IsNullOrEmpty(Package))
            {
                // Note: Buffer size must be greater than zero, even if the file size is zero.
                return new FileStream(
                PhysicalPath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.ReadWrite,
                1024 * 64,
                FileOptions.Asynchronous | FileOptions.SequentialScan);
            }
            else
            {
                ZipArchive archive = ZipFile.OpenRead(Package);
                return archive.Entries.First(e => e.Name == Name).Open();
            }
        }
    }

    /// <summary>
    /// Class defining the enumerable of directory content
    /// </summary>
    internal class AltinnEnumerableDirectoryContents : IDirectoryContents
    {
        private readonly IEnumerable<IFileInfo> _entries;

        /// <summary>
        /// Initializes a new instance of the <see cref="AltinnEnumerableDirectoryContents"/> class
        /// </summary>
        /// <param name="entries">The fileInfo entries in a directory</param>
        public AltinnEnumerableDirectoryContents(IEnumerable<IFileInfo> entries)
        {
            _entries = entries;
        }

        /// <summary>
        /// Gets a value indicating whether the directory exists
        /// </summary>
        public bool Exists
        {
            get { return true; }
        }

        /// <summary>
        /// Gets the Enumerator
        /// </summary>
        /// <returns>The enumerator over FileInfo in the directory</returns>
        public IEnumerator<IFileInfo> GetEnumerator()
        {
            return _entries.GetEnumerator();
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return _entries.GetEnumerator();
        }
    }
}