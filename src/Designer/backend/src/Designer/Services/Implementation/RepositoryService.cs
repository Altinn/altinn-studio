#nullable disable
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Implementation of the repository service needed for creating and updating apps in AltinnCore.
    /// </summary>
    public class RepositoryService : IRepository
    {
        // Using Norwegian name of initial page to be consistent
        // with automatic naming from frontend when adding new page
        private const string InitialLayout = "Side1";

        private readonly string _resourceIdentifierRegex = "^[a-z0-9_æøå-]*$";

        private readonly ServiceRepositorySettings _settings;
        private readonly GeneralSettings _generalSettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IGiteaClient _giteaClient;
        private readonly ISourceControl _sourceControl;
        private readonly ILogger _logger;
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
        private readonly IApplicationMetadataService _applicationMetadataService;
        private readonly ITextsService _textsService;
        private readonly IResourceRegistry _resourceRegistryService;
        private readonly ICustomTemplateService _templateService;
        private readonly JsonSerializerOptions _serializerOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = true };

        /// <summary>
        /// Initializes a new instance of the <see cref="RepositoryService"/> class
        /// </summary>
        /// <param name="repositorySettings">The settings for the app repository</param>
        /// <param name="generalSettings">The current general settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="giteaClient">The gitea client</param>
        /// <param name="sourceControl">the source control</param>
        /// <param name="logger">The logger</param>
        /// <param name="altinnGitRepositoryFactory">Factory class that knows how to create types of <see cref="AltinnGitRepository"/></param>
        /// <param name="applicationMetadataService">The service for handling the application metadata file</param>
        /// <param name="textsService">The service for handling texts</param>
        /// <param name="resourceRegistryService">The service for publishing resource in the ResourceRegistry</param>
        /// <param name="templateService">The service for handling custom templates</param>
        public RepositoryService(
            ServiceRepositorySettings repositorySettings,
            GeneralSettings generalSettings,
            IHttpContextAccessor httpContextAccessor,
            IGiteaClient giteaClient,
            ISourceControl sourceControl,
            ILogger<RepositoryService> logger,
            IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
            IApplicationMetadataService applicationMetadataService,
            ITextsService textsService,
            IResourceRegistry resourceRegistryService,
            ICustomTemplateService templateService)
        {
            _settings = repositorySettings;
            _generalSettings = generalSettings;
            _httpContextAccessor = httpContextAccessor;
            _giteaClient = giteaClient;
            _sourceControl = sourceControl;
            _logger = logger;
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
            _applicationMetadataService = applicationMetadataService;
            _textsService = textsService;
            _resourceRegistryService = resourceRegistryService;
            _templateService = templateService;
        }

        /// <summary>
        /// Method that creates service metadata for a new app
        /// </summary>
        /// <param name="serviceMetadata">The <see cref="ModelMetadata"/></param>
        /// <returns>A boolean indicating if creation of service metadata went ok</returns>
        #region Service metadata
        public bool CreateServiceMetadata(ModelMetadata serviceMetadata)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here.
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            string orgPath = _settings.GetOrgPath(serviceMetadata.Org, developer);
            string appPath = Path.Combine(orgPath, serviceMetadata.RepositoryName);

            Directory.CreateDirectory(orgPath);
            Directory.CreateDirectory(appPath);

            // Creates all the files
            CopyFolderToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _generalSettings.DeploymentLocation, _settings.GetDeploymentFolderName());
            CopyFolderToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _generalSettings.AppLocation, _settings.GetAppFolderName());
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _settings.DockerfileFileName);
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _settings.AppSlnFileName);
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _settings.GitIgnoreFileName);
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _settings.DockerIgnoreFileName);

            return true;
        }

        #endregion

        /// <summary>
        /// Returns the path to the app folder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A string containing the path</returns>
        public string GetAppPath(string org, string app)
        {
            return _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
        }

        /// <summary>
        /// Merges the provided resource texts with the resource text in the the given path
        /// </summary>
        /// <param name="path">path for the resource files</param>
        /// <param name="resourceTexts">resource text dictionary</param>
        /// <remarks>
        /// Format of the dictionary is: &lt;textResourceElementId &lt;language, textResourceElement&gt;&gt;
        /// </remarks>
        /// <returns>resource texts</returns>
        private static Dictionary<string, Dictionary<string, TextResourceElement>> MergeResourceTexts(string path, Dictionary<string, Dictionary<string, TextResourceElement>> resourceTexts)
        {
            if (Directory.Exists(path))
            {
                string[] directoryFiles = Directory.GetFiles(path);

                foreach (string directoryFile in directoryFiles)
                {
                    string fileName = Path.GetFileName(directoryFile);
                    string[] nameParts = fileName.Split('.');
                    if (nameParts.Length == 3 && nameParts[0] == "resource" && nameParts[2] == "json")
                    {
                        string content = File.ReadAllText(directoryFile);
                        TextResource r = JsonConvert.DeserializeObject<TextResource>(content);
                        string culture = r.Language;

                        foreach (TextResourceElement resource in r.Resources)
                        {
                            string key = resource.Id;
                            string value = resource.Value;

                            if (key != null && value != null)
                            {
                                if (!resourceTexts.ContainsKey(key))
                                {
                                    resourceTexts.Add(key, new Dictionary<string, TextResourceElement>());
                                }

                                if (!resourceTexts[key].ContainsKey(culture))
                                {
                                    resourceTexts[key].Add(culture, resource);
                                }
                            }
                        }
                    }
                }
            }

            return resourceTexts;
        }

        /// <inheritdoc/>
        public string GetWidgetSettings(AltinnRepoEditingContext altinnRepoEditingContext)
        {
            string filePath = _settings.GetWidgetSettingsPath(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            string fileData = null;
            if (File.Exists(filePath))
            {
                fileData = File.ReadAllText(filePath, Encoding.UTF8);
            }

            return fileData;
        }

        public bool DeleteLanguage(AltinnRepoEditingContext altinnRepoEditingContext, string id)
        {
            string filename = _settings.GetLanguageResourcePath(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer) + $"resource.{id.AsFileName()}.json";
            bool deleted = false;

            if (File.Exists(filename))
            {
                File.Delete(filename);
                deleted = true;
            }

            return deleted;
        }

        /// <inheritdoc/>
        public async Task<RepositoryClient.Model.Repository> CreateService(string org, ServiceConfiguration serviceConfig, List<CustomTemplateReference> templates)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string token = await _httpContextAccessor.HttpContext.GetDeveloperAppTokenAsync();
            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, serviceConfig.RepositoryName, developer, token);
            string repoPath = _settings.GetServicePath(org, serviceConfig.RepositoryName, developer);
            var options = new CreateRepoOption(serviceConfig.RepositoryName);

            RepositoryClient.Model.Repository repository = await CreateRemoteRepository(org, options);

            if (repository != null && repository.RepositoryCreatedStatus == HttpStatusCode.Created)
            {
                if (Directory.Exists(repoPath))
                {
                    FireDeletionOfLocalRepo(org, serviceConfig.RepositoryName, developer);
                }

                _sourceControl.CloneRemoteRepository(authenticatedContext);

                ModelMetadata metadata = new()
                {
                    Org = org,
                    ServiceName = serviceConfig.ServiceName,
                    RepositoryName = serviceConfig.RepositoryName,
                };

                try
                {
                    // This creates all files
                    CreateServiceMetadata(metadata);
                    await _textsService.CreateLanguageResources(org, serviceConfig.RepositoryName, developer);
                    await ApplyCustomTemplates(org, serviceConfig.RepositoryName, developer, templates);
                    await CreateAltinnStudioSettings(org, serviceConfig.RepositoryName, developer, templates);

                    await _applicationMetadataService.SetCoreProperties(org, serviceConfig.RepositoryName, serviceConfig.ServiceName);

                    CommitInfo commitInfo = new() { Org = org, Repository = serviceConfig.RepositoryName, Message = "App created" };
                    _sourceControl.PushChangesForRepository(authenticatedContext, commitInfo);
                }
                catch (Exception)
                {
                    // Cleanup repository on failure
                    await DeleteRepository(org, serviceConfig.RepositoryName);
                    throw;
                }
            }

            return repository;
        }

        private async Task ApplyCustomTemplates(string org, string repositoryName, string developer, List<CustomTemplateReference> templates)
        {
            foreach (CustomTemplateReference templateRef in templates)
            {
                await _templateService.ApplyTemplateToRepository(templateRef.Owner, templateRef.Id, org, repositoryName, developer);
            }
        }

        private async Task CreateAltinnStudioSettings(string org, string repository, string developer, List<CustomTemplateReference> templates)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);
            var settings = new AltinnStudioSettings() { RepoType = AltinnRepositoryType.App, UseNullableReferenceTypes = true, Templates = templates };
            await altinnGitRepository.SaveAltinnStudioSettings(settings);
        }

        /// <inheritdoc/>
        public async Task<RepositoryClient.Model.Repository> CopyRepository(string org, string sourceRepository, string targetRepository, string developer, string targetOrg = null)
        {
            targetOrg ??= org;
            var options = new CreateRepoOption(targetRepository);
            string token = await _httpContextAccessor.HttpContext.GetDeveloperAppTokenAsync();
            AltinnAuthenticatedRepoEditingContext sourceContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, sourceRepository, developer, token);
            AltinnAuthenticatedRepoEditingContext targetContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(targetOrg, targetRepository, developer, token);

            RepositoryClient.Model.Repository repository = await CreateRemoteRepository(targetOrg, options);

            if (repository == null || repository.RepositoryCreatedStatus != HttpStatusCode.Created)
            {
                return repository;
            }

            string targetRepositoryPath = _settings.GetServicePath(targetOrg, targetRepository, developer);

            if (Directory.Exists(targetRepositoryPath))
            {
                FireDeletionOfLocalRepo(targetOrg, targetRepository, developer);
            }

            _sourceControl.CloneRemoteRepository(sourceContext, targetRepositoryPath);
            var targetAppRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(targetOrg, targetRepository, developer);

            await targetAppRepository.SearchAndReplaceInFile(".git/config", $"repos/{org}/{sourceRepository}.git", $"repos/{targetOrg}/{targetRepository}.git");

            ApplicationMetadata appMetadata = await targetAppRepository.GetApplicationMetadata();
            appMetadata.Id = $"{targetOrg}/{targetRepository}";
            appMetadata.Org = targetOrg;
            appMetadata.CreatedBy = developer;
            appMetadata.LastChangedBy = developer;
            appMetadata.Created = DateTime.UtcNow;
            appMetadata.LastChanged = appMetadata.Created;
            await targetAppRepository.SaveApplicationMetadata(appMetadata);

            if (targetAppRepository.ServiceConfigExists())
            {
                ServiceConfiguration serviceConfig = await targetAppRepository.GetServiceConfiguration();
                serviceConfig.RepositoryName = targetAppRepository.Repository;
                serviceConfig.ServiceName = targetAppRepository.Repository;
                await targetAppRepository.SaveAppMetadataConfig(serviceConfig);
            }

            CommitInfo commitInfo = new() { Org = targetOrg, Repository = targetRepository, Message = $"App cloned from {sourceRepository} {DateTime.Now.Date.ToShortDateString()}" };
            _sourceControl.PushChangesForRepository(targetContext, commitInfo);

            return repository;
        }

        /// <inheritdoc />
        public async Task<bool> ResetLocalRepository(AltinnRepoEditingContext altinnRepoEditingContext)
        {
            string repoPath = _settings.GetServicePath(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            string token = await _httpContextAccessor.HttpContext.GetDeveloperAppTokenAsync();
            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromEditingContext(altinnRepoEditingContext, token);

            if (Directory.Exists(repoPath))
            {
                FireDeletionOfLocalRepo(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
                _sourceControl.CloneRemoteRepository(authenticatedContext);
                return true;
            }

            return false;
        }

        /// <summary>
        /// create a repository in gitea for the given org and options
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="options">the options for creating a repository</param>
        /// <returns>The newly created repository</returns>
        public async Task<RepositoryClient.Model.Repository> CreateRemoteRepository(string org, CreateRepoOption options)
        {
            return await _giteaClient.CreateRepository(org, options);
        }

        private void CopyFolderToApp(string org, string app, string sourcePath, string path)
        {
            string targetPath = Path.Combine(_settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)), path);

            // Create the app deployment folder
            Directory.CreateDirectory(targetPath);

            // Create all of the directories
            foreach (string dirPath in Directory.GetDirectories(sourcePath, "*", SearchOption.AllDirectories))
            {
                Directory.CreateDirectory(dirPath.Replace(sourcePath, targetPath));
            }

            // Copy all the files & Replaces any files with the same name
            foreach (string newPath in Directory.GetFiles(sourcePath, "*.*", SearchOption.AllDirectories))
            {
                File.Copy(newPath, newPath.Replace(sourcePath, targetPath), true);
            }
        }

        private void CopyFileToApp(string org, string app, string fileName)
        {
            string appPath = _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            File.Copy($"{_generalSettings.TemplatePath}/{fileName}", Path.Combine(appPath, fileName));
        }

        /// <inheritdoc/>
        public List<FileSystemObject> GetContents(string org, string repository, string path = "")
        {
            string repositoryPath = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            if (!Directory.Exists(repositoryPath))
            {
                return null;
            }

            string contentPath = ResolvePathWithinParentDirectory(repositoryPath, path);
            if (contentPath is null)
            {
                return null;
            }

            List<FileSystemObject> contents = GetFileSystemObjects(contentPath);

            string repositoryFullPath = Path.GetFullPath(repositoryPath);
            contents.ForEach(c => c.Path = Path.GetRelativePath(repositoryFullPath, c.Path).Replace("\\", "/"));

            return contents;
        }

        /// <summary>
        /// Resolves and validates that a requested path is within a parent directory.
        /// Returns the resolved full path, or null if the path escapes the parent.
        /// </summary>
        private static string ResolvePathWithinParentDirectory(string parentDirectory, string relativePath)
        {
            string fullParent = Path.GetFullPath(parentDirectory);

            if (string.IsNullOrEmpty(relativePath))
            {
                return fullParent;
            }

            string resolvedPath = Path.GetFullPath(Path.Join(fullParent, relativePath));
            string parentWithSeparator = fullParent.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                                         + Path.DirectorySeparatorChar;

            if (!resolvedPath.StartsWith(parentWithSeparator, StringComparison.OrdinalIgnoreCase)
                && !string.Equals(resolvedPath, fullParent, StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            return resolvedPath;
        }

        private List<FileSystemObject> GetFileSystemObjects(string contentPath)
        {
            List<FileSystemObject> contents = new();

            if (File.Exists(contentPath))
            {
                contents.Add(GetFileSystemObjectForFile(contentPath, includeContent: true));
            }
            else if (Directory.Exists(contentPath))
            {
                foreach (string directoryPath in Directory.GetDirectories(contentPath))
                {
                    contents.Add(GetFileSystemObjectForDirectory(directoryPath));
                }
                foreach (string filePath in Directory.GetFiles(contentPath))
                {
                    contents.Add(GetFileSystemObjectForFile(filePath));
                }
            }

            return contents;
        }

        public async Task<List<ServiceResource>> GetServiceResources(string org, string repository, string path = "", CancellationToken cancellationToken = default)
        {
            List<FileSystemObject> resourceFiles = GetResourceFiles(org, repository, Path.Combine(path));
            string repopath = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            using SemaphoreSlim semaphore = new(50); // Limit to 50 concurrent tasks

            async Task<ServiceResource> ReadResourceAsync(FileSystemObject resourceFile)
            {
                await semaphore.WaitAsync(cancellationToken);
                try
                {
                    string fullPath = Path.Combine(repopath, resourceFile.Path);

                    var sw = Stopwatch.StartNew();
                    try
                    {
                        using FileStream stream = File.OpenRead(fullPath);
                        ServiceResource result = await System.Text.Json.JsonSerializer.DeserializeAsync<ServiceResource>(stream, _serializerOptions, cancellationToken);

                        sw.Stop();
                        // Structured log: file path, file name and elapsed ms
                        _logger.LogInformation("Read resource file {ResourcePath} (name={ResourceName}) in {ElapsedMs} ms", resourceFile.Path, resourceFile.Name, sw.ElapsedMilliseconds);

                        return result;
                    }
                    catch (Exception ex)
                    {
                        sw.Stop();
                        _logger.LogError(ex, "Failed to read/deserialize resource file {ResourcePath} (name={ResourceName}) after {ElapsedMs} ms", resourceFile.Path, resourceFile.Name, sw.ElapsedMilliseconds);
                        throw;
                    }
                }
                finally
                {
                    semaphore.Release();
                }
            }
            IEnumerable<Task<ServiceResource>> tasks = resourceFiles.Select(resourceFile => ReadResourceAsync(resourceFile));
            var serviceResourceList = await Task.WhenAll(tasks);
            return serviceResourceList.Where(r => r != null).ToList();
        }

        public ActionResult UpdateServiceResource(string org, string id, ServiceResource updatedResource)
        {
            if (updatedResource != null && id == updatedResource.Identifier)
            {
                string repository = string.Format("{0}-resources", org);
                List<FileSystemObject> resourceFiles = GetResourceFiles(org, repository);
                string repopath = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
                string resourceFileName = GetResourceFileName(updatedResource.Identifier);

                foreach (FileSystemObject resourceFile in resourceFiles)
                {
                    if (resourceFile.Name == resourceFileName)
                    {
                        string updatedResourceString = System.Text.Json.JsonSerializer.Serialize(updatedResource, _serializerOptions);
                        File.WriteAllText($"{repopath}/{resourceFile.Path}", updatedResourceString);
                        return new StatusCodeResult(201);
                    }
                }
            }
            else
            {
                return new StatusCodeResult(400);
            }

            return new StatusCodeResult(403);
        }

        public StatusCodeResult AddServiceResource(string org, ServiceResource newResource)
        {
            try
            {
                bool isResourceIdentifierValid = !string.IsNullOrEmpty(newResource.Identifier) && Regex.IsMatch(newResource.Identifier, _resourceIdentifierRegex) && !newResource.Identifier.StartsWith("app_");
                if (!isResourceIdentifierValid)
                {
                    return new StatusCodeResult(400);
                }
                string repository = $"{org}-resources";
                if (!CheckIfResourceFileAlreadyExists(newResource.Identifier, org, repository))
                {
                    string repopath = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
                    string fullPathOfNewResource = Path.Combine(repopath, newResource.Identifier.AsFileName(), GetResourceFileName(newResource.Identifier));
                    string newResourceJson = System.Text.Json.JsonSerializer.Serialize(newResource, _serializerOptions);
                    Directory.CreateDirectory(Path.Combine(repopath, newResource.Identifier.AsFileName()));
                    File.WriteAllText(fullPathOfNewResource, newResourceJson);

                    return new StatusCodeResult(201);
                }
                else
                {
                    return new StatusCodeResult(409);
                }
            }
            catch (Exception)
            {
                return new StatusCodeResult(400);
            }
        }

        public bool CheckIfResourceFileAlreadyExists(string identifier, string org, string repository)
        {
            List<FileSystemObject> resourceFiles = GetResourceFiles(org, repository);
            return resourceFiles.Any(resourceFile => resourceFile.Name.ToLower().Equals(GetResourceFileName(identifier).ToLower()));
        }

        public async Task<ServiceResource> GetServiceResourceById(string org, string repository, string identifier, CancellationToken cancellationToken = default)
        {
            List<ServiceResource> resourcesInRepo = await GetServiceResources(org, repository, identifier, cancellationToken);
            return resourcesInRepo.Where(r => r.Identifier == identifier).FirstOrDefault();
        }

        public async Task<ActionResult> PublishResource(string org, string repository, string id, string env, string policy = null)
        {
            ServiceResource resource = await GetServiceResourceById(org, repository, id);
            if (resource.HasCompetentAuthority == null || resource.HasCompetentAuthority.Orgcode != org)
            {
                _logger.LogWarning("Org mismatch for resource");
                return new StatusCodeResult(400);
            }

            return await _resourceRegistryService.PublishServiceResource(resource, env, policy);
        }

        private List<FileSystemObject> GetResourceFiles(string org, string repository, string path = "")
        {
            List<FileSystemObject> contents = GetContents(org, repository, path);
            List<FileSystemObject> resourceFiles = new List<FileSystemObject>();

            if (contents != null)
            {
                foreach (FileSystemObject resourceFile in contents)
                {
                    if (resourceFile.Type.Equals("Dir") && !resourceFile.Name.StartsWith("."))
                    {
                        List<FileSystemObject> contentsInFolder = GetContents(org, repository, resourceFile.Name);

                        if (contentsInFolder != null)
                        {
                            foreach (FileSystemObject content in contentsInFolder)
                            {
                                if (content.Name.EndsWith("_resource.json"))
                                {
                                    resourceFiles.Add(content);
                                }
                            }
                        }
                    }
                    if (resourceFile.Name.EndsWith("_resource.json"))
                    {
                        resourceFiles.Add(resourceFile);
                    }
                }
            }

            return resourceFiles;
        }

        private string GetResourceFileName(string identifier)
        {
            return string.Format("{0}_resource.json", identifier);
        }

        private FileSystemObject GetFileSystemObjectForFile(string path, bool includeContent = false)
        {
            FileInfo fi = new(path);
            string encoding;

            using (StreamReader sr = new(path))
            {
                encoding = sr.CurrentEncoding.EncodingName;
            }

            string content = null;
            if (includeContent)
            {
                content = File.ReadAllText(path, Encoding.UTF8);
            }

            FileSystemObject fso = new()
            {
                Type = FileSystemObjectType.File.ToString(),
                Name = fi.Name,
                Encoding = encoding,
                Path = fi.FullName,
                Content = content,
            };

            return fso;
        }

        private FileSystemObject GetFileSystemObjectForDirectory(string path)
        {
            DirectoryInfo di = new(path);
            FileSystemObject fso = new()
            {
                Type = FileSystemObjectType.Dir.ToString(),
                Name = di.Name,
                Path = path,
                Content = null,
                Encoding = null
            };

            return fso;
        }

        /// <inheritdoc/>
        public async Task DeleteRepository(string org, string repository)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnRepoEditingContext altinnRepoEditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);
            await _sourceControl.DeleteRepository(altinnRepoEditingContext);
        }

        public async Task<bool> SavePolicy(string org, string repo, string resourceId, XacmlPolicy xacmlPolicy)
        {
            string policyPath = GetPolicyPath(org, repo, resourceId);


            string xsd;
            await using (MemoryStream stream = new MemoryStream())
            await using (var xw = XmlWriter.Create(stream, new XmlWriterSettings { Indent = true, Async = true }))
            {
                XacmlSerializer.WritePolicy(xw, xacmlPolicy);
                xw.Flush();
                stream.Position = 0;
                xsd = Encoding.UTF8.GetString(stream.ToArray());
            }
            await WriteTextAsync(policyPath, xsd);

            return true;
        }

        public XacmlPolicy GetPolicy(string org, string repo, string resourceId)
        {
            string policyPath = GetPolicyPath(org, repo, resourceId);
            if (!File.Exists(policyPath))
            {
                return null;
            }

            XmlDocument policyDocument = new XmlDocument();
            policyDocument.Load(policyPath);
            XacmlPolicy policy;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                policy = XacmlParser.ParseXacmlPolicy(reader);
            }

            return policy;
        }

        public string GetPolicyPath(string org, string repo, string resourceId)
        {
            string localRepoPath = _settings.GetServicePath(org, repo, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string policyPath = Path.Combine(localRepoPath, _generalSettings.AuthorizationPolicyTemplate);
            if (!string.IsNullOrEmpty(resourceId))
            {
                policyPath = Path.Combine(localRepoPath, resourceId, resourceId + "_policy.xml");
            }

            return policyPath;
        }

        private static async Task WriteTextAsync(string absoluteFilePath, string text)
        {
            byte[] encodedText = Encoding.UTF8.GetBytes(text);
            await using FileStream sourceStream = new(absoluteFilePath, FileMode.Create, FileAccess.Write, FileShare.None, bufferSize: 4096, useAsync: true);
            await sourceStream.WriteAsync(encodedText.AsMemory(0, encodedText.Length));
        }

        private void FireDeletionOfLocalRepo(string org, string repo, string developer)
        {
            string origRepo = _settings.GetServicePath(org, repo, developer);
            if (!Directory.Exists(origRepo))
            {
                return;
            }
            // Rename the folder to be deleted. This operation should be much faster than delete.
            string deletePath = _settings.GetServicePath(org, $"{repo}_SCHEDULED_FOR_DELETE_{DateTime.Now.Ticks}", developer);
            Directory.Move(origRepo, deletePath);

            // Run deletion task in background. It's not a critical issue if it fails.
            Task.Run(() =>
            {
                try
                {
                    // On windows platform the deletion fail due to hidden files.
                    var directory = new DirectoryInfo(deletePath) { Attributes = FileAttributes.Normal };

                    foreach (var info in directory.GetFileSystemInfos("*", SearchOption.AllDirectories))
                    {
                        info.Attributes = FileAttributes.Normal;
                    }

                    directory.Delete(true);
                }
                catch
                {
                    _logger.LogWarning("Failed to delete repository {Repo} for org {Org}.", repo, org);
                }
            });
        }
    }
}
