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

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Implementation of the repository service needed for creating and updating apps in AltinnCore.
    /// </summary>
    /// <remarks>
    /// Initializes a new instance of the <see cref="RepositoryService"/> class
    /// </remarks>
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
    public partial class RepositoryService(
        ServiceRepositorySettings repositorySettings,
        GeneralSettings generalSettings,
        IHttpContextAccessor httpContextAccessor,
        IGiteaClient giteaClient,
        ISourceControl sourceControl,
        ILogger<RepositoryService> logger,
        IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IApplicationMetadataService applicationMetadataService,
        ITextsService textsService,
        IResourceRegistry resourceRegistryService) : IRepository
    {
        private readonly JsonSerializerOptions _serializerOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = true };

        /// <summary>
        /// Method that creates service metadata for a new app
        /// </summary>
        /// <param name="serviceMetadata">The <see cref="ModelMetadata"/></param>
        /// <param name="developer">The developer creating the service metadata</param>
        /// <returns>A boolean indicating if creation of service metadata went ok</returns>
        private bool CreateServiceMetadata(ModelMetadata serviceMetadata, string developer)
        {
            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here.
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            string orgPath = repositorySettings.GetOrgPath(serviceMetadata.Org, developer);
            string appPath = Path.Combine(orgPath, serviceMetadata.RepositoryName);

            Directory.CreateDirectory(orgPath);
            Directory.CreateDirectory(appPath);

            // Creates all the files
            // TODO: parallelize file and folder copy operations
            CopyFolderToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, generalSettings.DeploymentLocation, repositorySettings.GetDeploymentFolderName(), developer);
            CopyFolderToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, generalSettings.AppLocation, repositorySettings.GetAppFolderName(), developer);
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, repositorySettings.DockerfileFileName, developer);
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, repositorySettings.AppSlnFileName, developer);
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, repositorySettings.GitIgnoreFileName, developer);
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, repositorySettings.DockerIgnoreFileName, developer);
            UpdateAuthorizationPolicyFile(serviceMetadata.Org, serviceMetadata.RepositoryName, developer);
            return true;
        }

        /// <inheritdoc/>
        public string GetAppPath(string org, string app, string developer)
        {
            return repositorySettings.GetServicePath(org, app, developer);
        }

        /// <inheritdoc/>
        public string GetWidgetSettings(AltinnRepoEditingContext altinnRepoEditingContext)
        {
            string filePath = repositorySettings.GetWidgetSettingsPath(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            string fileData = null;
            if (File.Exists(filePath))
            {
                fileData = File.ReadAllText(filePath, Encoding.UTF8);
            }

            return fileData;
        }

        public bool DeleteLanguage(AltinnRepoEditingContext altinnRepoEditingContext, string id)
        {
            string filename = repositorySettings.GetLanguageResourcePath(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer) + $"resource.{id.AsFileName()}.json";
            bool deleted = false;

            if (File.Exists(filename))
            {
                File.Delete(filename);
                deleted = true;
            }

            return deleted;
        }

        /// <inheritdoc/>
        public async Task<RepositoryClient.Model.Repository> CreateService(string org, string developer, ServiceConfiguration serviceConfig)
        {
            string token = await httpContextAccessor.HttpContext.GetDeveloperAppTokenAsync();
            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, serviceConfig.RepositoryName, developer, token);
            string repoPath = repositorySettings.GetServicePath(org, serviceConfig.RepositoryName, developer);
            CreateRepoOption options = new(serviceConfig.RepositoryName);

            RepositoryClient.Model.Repository repository = await CreateRemoteRepository(org, options);

            if (repository != null && repository.RepositoryCreatedStatus == HttpStatusCode.Created)
            {
                if (Directory.Exists(repoPath))
                {
                    FireDeletionOfLocalRepo(org, serviceConfig.RepositoryName, developer);
                }

                sourceControl.CloneRemoteRepository(authenticatedContext);

                ModelMetadata metadata = new()
                {
                    Org = org,
                    ServiceName = serviceConfig.ServiceName,
                    RepositoryName = serviceConfig.RepositoryName,
                };

                // This creates all files
                CreateServiceMetadata(metadata, developer);
                await applicationMetadataService.CreateApplicationMetadata(org, serviceConfig.RepositoryName, serviceConfig.ServiceName);
                await textsService.CreateLanguageResources(org, serviceConfig.RepositoryName, developer);
                await CreateAltinnStudioSettings(org, serviceConfig.RepositoryName, developer);

                CommitInfo commitInfo = new() { Org = org, Repository = serviceConfig.RepositoryName, Message = "App created" };

                sourceControl.PushChangesForRepository(authenticatedContext, commitInfo);
            }

            return repository;
        }

        private async Task CreateAltinnStudioSettings(string org, string repository, string developer)
        {
            AltinnGitRepository altinnGitRepository = altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);
            AltinnStudioSettings settings = new() { RepoType = AltinnRepositoryType.App, UseNullableReferenceTypes = true };
            await altinnGitRepository.SaveAltinnStudioSettings(settings);
        }

        /// <inheritdoc/>
        public async Task<RepositoryClient.Model.Repository> CopyRepository(string org, string sourceRepository, string targetRepository, string developer, string targetOrg = null)
        {
            targetOrg ??= org;
            CreateRepoOption options = new(targetRepository);
            string token = await httpContextAccessor.HttpContext.GetDeveloperAppTokenAsync();
            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, sourceRepository, developer, token);

            RepositoryClient.Model.Repository repository = await CreateRemoteRepository(targetOrg, options);

            if (repository == null || repository.RepositoryCreatedStatus != HttpStatusCode.Created)
            {
                return repository;
            }

            string targetRepositoryPath = repositorySettings.GetServicePath(targetOrg, targetRepository, developer);

            if (Directory.Exists(targetRepositoryPath))
            {
                FireDeletionOfLocalRepo(targetOrg, targetRepository, developer);
            }

            sourceControl.CloneRemoteRepository(authenticatedContext, targetRepositoryPath);
            AltinnAppGitRepository targetAppRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(targetOrg, targetRepository, developer);

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
            sourceControl.PushChangesForRepository(authenticatedContext, commitInfo);

            return repository;
        }

        /// <inheritdoc />
        public async Task<bool> ResetLocalRepository(AltinnRepoEditingContext altinnRepoEditingContext)
        {
            string repoPath = repositorySettings.GetServicePath(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            string token = await httpContextAccessor.HttpContext.GetDeveloperAppTokenAsync();
            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromEditingContext(altinnRepoEditingContext, token);

            if (Directory.Exists(repoPath))
            {
                FireDeletionOfLocalRepo(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
                sourceControl.CloneRemoteRepository(authenticatedContext);
                return true;
            }

            return false;
        }

        /// <inheritdoc/>
        private async Task<RepositoryClient.Model.Repository> CreateRemoteRepository(string org, CreateRepoOption options)
        {
            return await giteaClient.CreateRepository(org, options);
        }

        // IKKE SLETT
        private void UpdateAuthorizationPolicyFile(string org, string app, string developer)
        {
            // Read the authorization policy template (XACML file).
            string path = repositorySettings.GetServicePath(org, app, developer);
            string policyPath = Path.Combine(path, generalSettings.AuthorizationPolicyTemplate);
            string authorizationPolicyData = File.ReadAllText(policyPath, Encoding.UTF8);

            File.WriteAllText(policyPath, authorizationPolicyData, Encoding.UTF8);
        }

        private void CopyFolderToApp(string org, string app, string sourcePath, string path, string developer)
        {
            string targetPath = Path.Combine(repositorySettings.GetServicePath(org, app, developer), path);

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

        private void CopyFileToApp(string org, string app, string fileName, string developer)
        {
            string appPath = repositorySettings.GetServicePath(org, app, developer);
            File.Copy($"{generalSettings.TemplatePath}/{fileName}", Path.Combine(appPath, fileName));
        }

        /// <inheritdoc/>
        public List<FileSystemObject> GetContents(string org, string repository, string developer, string path = "")
        {
            List<FileSystemObject> contents = [];
            string repositoryPath = repositorySettings.GetServicePath(org, repository, developer);
            string contentPath = Path.Combine(repositoryPath, path);

            // repository was not found
            if (!Directory.Exists(repositoryPath))
            {
                return null;
            }

            if (File.Exists(contentPath))
            {
                FileSystemObject f = GetFileSystemObjectForFile(contentPath);
                contents.Add(f);
            }
            else if (Directory.Exists(contentPath))
            {
                string[] dirs = Directory.GetDirectories(contentPath);
                foreach (string directoryPath in dirs)
                {
                    FileSystemObject d = GetFileSystemObjectForDirectory(directoryPath);
                    contents.Add(d);
                }

                string[] files = Directory.GetFiles(contentPath);
                foreach (string filePath in files)
                {
                    FileSystemObject f = GetFileSystemObjectForFile(filePath);
                    contents.Add(f);
                }
            }

            // setting all paths relative to repository
            contents.ForEach(c => c.Path = Path.GetRelativePath(repositoryPath, c.Path).Replace("\\", "/"));

            return contents;
        }

        /// <inheritdoc/>
        public async Task<List<ServiceResource>> GetServiceResources(string org, string repository, string developer, string path = "", CancellationToken cancellationToken = default)
        {
            List<FileSystemObject> resourceFiles = GetResourceFiles(org, repository, Path.Combine(path));
            string repopath = repositorySettings.GetServicePath(org, repository, developer);

            using SemaphoreSlim semaphore = new(50); // Limit to 50 concurrent tasks

            async Task<ServiceResource> ReadResourceAsync(FileSystemObject resourceFile)
            {
                await semaphore.WaitAsync(cancellationToken);
                try
                {
                    string fullPath = Path.Combine(repopath, resourceFile.Path);

                    Stopwatch sw = Stopwatch.StartNew();
                    try
                    {
                        using FileStream stream = File.OpenRead(fullPath);
                        ServiceResource result = await System.Text.Json.JsonSerializer.DeserializeAsync<ServiceResource>(stream, _serializerOptions, cancellationToken);

                        sw.Stop();
                        // Structured log: file path, file name and elapsed ms
                        logger.LogInformation("Read resource file {ResourcePath} (name={ResourceName}) in {ElapsedMs} ms", resourceFile.Path, resourceFile.Name, sw.ElapsedMilliseconds);

                        return result;
                    }
                    catch (Exception ex)
                    {
                        sw.Stop();
                        logger.LogError(ex, "Failed to read/deserialize resource file {ResourcePath} (name={ResourceName}) after {ElapsedMs} ms", resourceFile.Path, resourceFile.Name, sw.ElapsedMilliseconds);
                        throw;
                    }
                }
                finally
                {
                    semaphore.Release();
                }
            }
            IEnumerable<Task<ServiceResource>> tasks = resourceFiles.Select(resourceFile => ReadResourceAsync(resourceFile));
            ServiceResource[] serviceResourceList = await Task.WhenAll(tasks);
            return serviceResourceList.Where(r => r != null).ToList();
        }

        /// <inheritdoc/>
        public ActionResult UpdateServiceResource(string org, string id, ServiceResource updatedResource)
        {
            if (updatedResource != null && id == updatedResource.Identifier)
            {
                string repository = string.Format("{0}-resources", org);
                List<FileSystemObject> resourceFiles = GetResourceFiles(org, repository);
                string repopath = repositorySettings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext));
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

        /// <inheritdoc/>
        public StatusCodeResult AddServiceResource(string org, ServiceResource newResource)
        {
            try
            {
                bool isResourceIdentifierValid = !string.IsNullOrEmpty(newResource.Identifier) && ResourceIdentifierRegex().IsMatch(newResource.Identifier) && !newResource.Identifier.StartsWith("app_");
                if (!isResourceIdentifierValid)
                {
                    return new StatusCodeResult(400);
                }
                string repository = $"{org}-resources";
                if (!CheckIfResourceFileAlreadyExists(newResource.Identifier, org, repository))
                {
                    string repopath = repositorySettings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext));
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

        private bool CheckIfResourceFileAlreadyExists(string identifier, string org, string repository)
        {
            List<FileSystemObject> resourceFiles = GetResourceFiles(org, repository);
            return resourceFiles.Any(resourceFile => resourceFile.Name.ToLower().Equals(GetResourceFileName(identifier).ToLower()));
        }

        /// <inheritdoc/>
        public async Task<ServiceResource> GetServiceResourceById(string org, string repository, string developer, string identifier, CancellationToken cancellationToken = default)
        {
            List<ServiceResource> resourcesInRepo = await GetServiceResources(org, repository, developer, identifier, cancellationToken);
            return resourcesInRepo.Where(r => r.Identifier == identifier).FirstOrDefault();
        }

        /// <inheritdoc/>
        public async Task<ActionResult> PublishResource(string org, string repository, string developer, string id, string env, string policy = null)
        {
            ServiceResource resource = await GetServiceResourceById(org, repository, developer, id);
            if (resource.HasCompetentAuthority == null || resource.HasCompetentAuthority.Orgcode != org)
            {
                logger.LogWarning("Org mismatch for resource");
                return new StatusCodeResult(400);
            }

            return await resourceRegistryService.PublishServiceResource(resource, env, policy);
        }

        private List<FileSystemObject> GetResourceFiles(string org, string repository, string path = "")
        {
            List<FileSystemObject> contents = GetContents(org, repository, path);
            List<FileSystemObject> resourceFiles = [];

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

        private FileSystemObject GetFileSystemObjectForFile(string path)
        {
            FileInfo fi = new(path);
            string encoding;

            using (StreamReader sr = new(path))
            {
                encoding = sr.CurrentEncoding.EncodingName;
            }

            FileSystemObject fso = new()
            {
                Type = FileSystemObjectType.File.ToString(),
                Name = fi.Name,
                Encoding = encoding,
                Path = fi.FullName,
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
        public async Task DeleteRepository(string org, string repository, string developer)
        {
            AltinnRepoEditingContext altinnRepoEditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);
            await sourceControl.DeleteRepository(altinnRepoEditingContext);
        }

        /// <inheritdoc/>
        public async Task<bool> SavePolicy(string org, string repo, string resourceId, XacmlPolicy xacmlPolicy)
        {
            string policyPath = GetPolicyPath(org, repo, resourceId);


            string xsd;
            await using (MemoryStream stream = new())
            await using (XmlWriter xw = XmlWriter.Create(stream, new XmlWriterSettings { Indent = true, Async = true }))
            {
                XacmlSerializer.WritePolicy(xw, xacmlPolicy);
                xw.Flush();
                stream.Position = 0;
                xsd = Encoding.UTF8.GetString(stream.ToArray());
            }
            await WriteTextAsync(policyPath, xsd);

            return true;
        }

        /// <inheritdoc/>
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

        /// <inheritdoc/>
        public string GetPolicyPath(string org, string repo, string resourceId)
        {
            string localRepoPath = repositorySettings.GetServicePath(org, repo, AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext));
            string policyPath = Path.Combine(localRepoPath, generalSettings.AuthorizationPolicyTemplate);
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
            string origRepo = repositorySettings.GetServicePath(org, repo, developer);
            if (!Directory.Exists(origRepo))
            {
                return;
            }
            // Rename the folder to be deleted. This operation should be much faster than delete.
            string deletePath = repositorySettings.GetServicePath(org, $"{repo}_SCHEDULED_FOR_DELETE_{DateTime.Now.Ticks}", developer);
            Directory.Move(origRepo, deletePath);

            // Run deletion task in background. It's not a critical issue if it fails.
            Task.Run(() =>
            {
                try
                {
                    // On windows platform the deletion fail due to hidden files.
                    DirectoryInfo directory = new(deletePath) { Attributes = FileAttributes.Normal };

                    foreach (FileSystemInfo info in directory.GetFileSystemInfos("*", SearchOption.AllDirectories))
                    {
                        info.Attributes = FileAttributes.Normal;
                    }

                    directory.Delete(true);
                }
                catch
                {
                    logger.LogWarning("Failed to delete repository {Repo} for org {Org}.", repo, org);
                }
            });
        }

        [GeneratedRegex("^[a-z0-9_æøå-]*$")]
        private static partial Regex ResourceIdentifierRegex();
    }
}
