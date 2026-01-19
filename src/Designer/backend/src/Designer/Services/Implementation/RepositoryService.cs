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
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
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
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(serviceMetadata.Org, serviceMetadata.RepositoryName, developer);

            Directory.CreateDirectory(orgPath);
            Directory.CreateDirectory(appPath);

            // Creates all the files
            // TODO: parallelize file and folder copy operations
            CopyFolderToApp(editingContext, generalSettings.DeploymentLocation, repositorySettings.GetDeploymentFolderName());
            CopyFolderToApp(editingContext, generalSettings.AppLocation, repositorySettings.GetAppFolderName());
            CopyFileToApp(editingContext, repositorySettings.DockerfileFileName);
            CopyFileToApp(editingContext, repositorySettings.AppSlnFileName);
            CopyFileToApp(editingContext, repositorySettings.GitIgnoreFileName);
            CopyFileToApp(editingContext, repositorySettings.DockerIgnoreFileName);
            UpdateAuthorizationPolicyFile(editingContext);
            return true;
        }

        /// <inheritdoc/>
        public string GetAppPath(AltinnRepoEditingContext editingContext)
        {
            return repositorySettings.GetServicePath(editingContext.Org, editingContext.Repo, editingContext.Developer);
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
        public async Task<RepositoryClient.Model.Repository> CreateService(AltinnAuthenticatedRepoEditingContext authenticatedContext, ServiceConfiguration serviceConfig)
        {
            string repoPath = repositorySettings.GetServicePath(authenticatedContext.Org, authenticatedContext.Repo, authenticatedContext.Developer);
            CreateRepoOption options = new(serviceConfig.RepositoryName);

            RepositoryClient.Model.Repository repository = await CreateRemoteRepository(authenticatedContext.Org, options);

            if (repository != null && repository.RepositoryCreatedStatus == HttpStatusCode.Created)
            {
                if (Directory.Exists(repoPath))
                {
                    FireDeletionOfLocalRepo(authenticatedContext.Org, serviceConfig.RepositoryName, authenticatedContext.Developer);
                }

                sourceControl.CloneRemoteRepository(authenticatedContext);

                ModelMetadata metadata = new()
                {
                    Org = authenticatedContext.Org,
                    ServiceName = serviceConfig.ServiceName,
                    RepositoryName = serviceConfig.RepositoryName,
                };

                // This creates all files
                CreateServiceMetadata(metadata, authenticatedContext.Developer);
                await applicationMetadataService.CreateApplicationMetadata(authenticatedContext.Org, serviceConfig.RepositoryName, serviceConfig.ServiceName);
                await textsService.CreateLanguageResources(authenticatedContext.Org, serviceConfig.RepositoryName, authenticatedContext.Developer);
                await CreateAltinnStudioSettings(authenticatedContext);

                CommitInfo commitInfo = new() { Org = authenticatedContext.Org, Repository = serviceConfig.RepositoryName, Message = "App created" };
                sourceControl.PushChangesForRepository(authenticatedContext, commitInfo);
            }

            return repository;
        }

        private async Task CreateAltinnStudioSettings(AltinnRepoEditingContext editingContext)
        {
            AltinnGitRepository altinnGitRepository = altinnGitRepositoryFactory.GetAltinnGitRepository(editingContext.Org, editingContext.Repo, editingContext.Developer);
            AltinnStudioSettings settings = new() { RepoType = AltinnRepositoryType.App, UseNullableReferenceTypes = true };
            await altinnGitRepository.SaveAltinnStudioSettings(settings);
        }

        /// <inheritdoc/>
        public async Task<RepositoryClient.Model.Repository> CopyRepository(AltinnAuthenticatedRepoEditingContext authenticatedContext, string targetRepository, string targetOrg = null)
        {
            targetOrg ??= authenticatedContext.Org;
            CreateRepoOption options = new(targetRepository);

            RepositoryClient.Model.Repository repository = await CreateRemoteRepository(targetOrg, options);

            if (repository == null || repository.RepositoryCreatedStatus != HttpStatusCode.Created)
            {
                return repository;
            }

            string targetRepositoryPath = repositorySettings.GetServicePath(targetOrg, targetRepository, authenticatedContext.Developer);

            if (Directory.Exists(targetRepositoryPath))
            {
                FireDeletionOfLocalRepo(targetOrg, targetRepository, authenticatedContext.Developer);
            }

            sourceControl.CloneRemoteRepository(authenticatedContext, targetRepositoryPath);
            AltinnAppGitRepository targetAppRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(targetOrg, targetRepository, authenticatedContext.Developer);
            await targetAppRepository.SearchAndReplaceInFile(".git/config", $"repos/{authenticatedContext.Org}/{authenticatedContext.Repo}.git", $"repos/{targetOrg}/{targetRepository}.git");

            ApplicationMetadata appMetadata = await targetAppRepository.GetApplicationMetadata();
            appMetadata.Id = $"{targetOrg}/{targetRepository}";
            appMetadata.Org = targetOrg;
            appMetadata.CreatedBy = authenticatedContext.Developer;
            appMetadata.LastChangedBy = authenticatedContext.Developer;
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

            CommitInfo commitInfo = new() { Org = targetOrg, Repository = targetRepository, Message = $"App cloned from {authenticatedContext.Repo} {DateTime.Now.Date.ToShortDateString()}" };
            sourceControl.PushChangesForRepository(authenticatedContext, commitInfo);

            return repository;
        }

        /// <inheritdoc />
        public bool ResetLocalRepository(AltinnAuthenticatedRepoEditingContext authenticatedContext)
        {
            string repoPath = repositorySettings.GetServicePath(authenticatedContext.Org, authenticatedContext.Repo, authenticatedContext.Developer);

            if (Directory.Exists(repoPath))
            {
                FireDeletionOfLocalRepo(authenticatedContext.Org, authenticatedContext.Repo, authenticatedContext.Developer);
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
        private void UpdateAuthorizationPolicyFile(AltinnRepoEditingContext editingContext)
        {
            // Read the authorization policy template (XACML file).
            string path = repositorySettings.GetServicePath(editingContext.Org, editingContext.Repo, editingContext.Developer);
            string policyPath = Path.Combine(path, generalSettings.AuthorizationPolicyTemplate);
            string authorizationPolicyData = File.ReadAllText(policyPath, Encoding.UTF8);

            File.WriteAllText(policyPath, authorizationPolicyData, Encoding.UTF8);
        }

        private void CopyFolderToApp(AltinnRepoEditingContext editingContext, string sourcePath, string path)
        {
            string targetPath = Path.Combine(repositorySettings.GetServicePath(editingContext.Org, editingContext.Repo, editingContext.Developer), path);

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

        private void CopyFileToApp(AltinnRepoEditingContext editingContext, string fileName)
        {
            string appPath = repositorySettings.GetServicePath(editingContext.Org, editingContext.Repo, editingContext.Developer);
            File.Copy($"{generalSettings.TemplatePath}/{fileName}", Path.Combine(appPath, fileName));
        }

        /// <inheritdoc/>
        public List<FileSystemObject> GetContents(AltinnRepoEditingContext editingContext, string path = "")
        {
            List<FileSystemObject> contents = [];
            string repositoryPath = repositorySettings.GetServicePath(editingContext.Org, editingContext.Repo, editingContext.Developer);
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
        public async Task<List<ServiceResource>> GetServiceResources(AltinnRepoEditingContext editingContext, string path = "", CancellationToken cancellationToken = default)
        {
            List<FileSystemObject> resourceFiles = GetResourceFiles(editingContext, Path.Combine(path));
            string repopath = repositorySettings.GetServicePath(editingContext.Org, editingContext.Repo, editingContext.Developer);

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
        public ActionResult UpdateServiceResource(string org, string id, string developer, ServiceResource updatedResource)
        {
            if (updatedResource != null && id == updatedResource.Identifier)
            {
                string repository = string.Format("{0}-resources", org);
                AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);
                List<FileSystemObject> resourceFiles = GetResourceFiles(editingContext, developer);
                string repopath = repositorySettings.GetServicePath(editingContext.Org, editingContext.Repo, editingContext.Developer);
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
        public StatusCodeResult AddServiceResource(string org, string developer, ServiceResource newResource)
        {
            try
            {
                bool isResourceIdentifierValid = !string.IsNullOrEmpty(newResource.Identifier) && ResourceIdentifierRegex().IsMatch(newResource.Identifier) && !newResource.Identifier.StartsWith("app_");
                if (!isResourceIdentifierValid)
                {
                    return new StatusCodeResult(400);
                }
                string repository = $"{org}-resources";
                AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);
                if (!CheckIfResourceFileAlreadyExists(editingContext, newResource.Identifier))
                {
                    string repopath = repositorySettings.GetServicePath(editingContext.Org, editingContext.Repo, editingContext.Developer);
                    string fullPathOfNewResource = Path.Combine(repopath, newResource.Identifier.AsFileName(), GetResourceFileName(newResource.Identifier));
                    string newResourceJson = JsonSerializer.Serialize(newResource, _serializerOptions);
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

        private bool CheckIfResourceFileAlreadyExists(AltinnRepoEditingContext editingContext, string identifier)
        {
            List<FileSystemObject> resourceFiles = GetResourceFiles(editingContext);
            return resourceFiles.Any(resourceFile => resourceFile.Name.ToLower().Equals(GetResourceFileName(identifier).ToLower()));
        }

        /// <inheritdoc/>
        public async Task<ServiceResource> GetServiceResourceById(AltinnRepoEditingContext editingContext, string identifier, CancellationToken cancellationToken = default)
        {
            List<ServiceResource> resourcesInRepo = await GetServiceResources(editingContext, identifier, cancellationToken);
            return resourcesInRepo.Where(r => r.Identifier == identifier).FirstOrDefault();
        }

        /// <inheritdoc/>
        public async Task<ActionResult> PublishResource(AltinnRepoEditingContext editingContext, string id, string env, string policy = null)
        {
            ServiceResource resource = await GetServiceResourceById(editingContext, id);
            if (resource.HasCompetentAuthority == null || resource.HasCompetentAuthority.Orgcode != editingContext.Org)
            {
                logger.LogWarning("Org mismatch for resource");
                return new StatusCodeResult(400);
            }

            return await resourceRegistryService.PublishServiceResource(resource, env, policy);
        }

        private List<FileSystemObject> GetResourceFiles(AltinnRepoEditingContext editingContext, string path = "")
        {
            List<FileSystemObject> contents = GetContents(editingContext, path);
            List<FileSystemObject> resourceFiles = [];

            if (contents != null)
            {
                foreach (FileSystemObject resourceFile in contents)
                {
                    if (resourceFile.Type.Equals("Dir") && !resourceFile.Name.StartsWith("."))
                    {
                        List<FileSystemObject> contentsInFolder = GetContents(editingContext, resourceFile.Name);

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
        public async Task<bool> SavePolicy(string org, string repo, string developer, string resourceId, XacmlPolicy xacmlPolicy)
        {
            string policyPath = GetPolicyPath(org, repo, developer, resourceId);


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
        public XacmlPolicy GetPolicy(string org, string repo, string developer, string resourceId)
        {
            string policyPath = GetPolicyPath(org, repo, developer, resourceId);
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
        public string GetPolicyPath(string org, string repo, string developer, string resourceId)
        {
            string localRepoPath = repositorySettings.GetServicePath(org, repo, developer);
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
