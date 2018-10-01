using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;

using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Helpers.Extensions;
using AltinnCore.Common.Services.Interfaces;

using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// The view repository.
    /// </summary>
    public class ViewRepository : IViewRepository
    {
        private readonly IRepository _repository;
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="ViewRepository"/> class.
        /// </summary>
        /// <param name="repository">
        /// The repository.
        /// </param>
        /// <param name="repositorySettings">
        /// The service repository settings.
        /// </param>
        public ViewRepository(IRepository repository, IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor)
        {
            _repository = repository;
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Create View metadata for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="view">The view metadata</param>
        /// <returns>A boolean indicating if saving was ok. False if duplicate view name</returns>
        public bool CreateView(string org, string service, string edition, ViewMetadata view)
        {
            var views = GetViews(org, service, edition);
            if (views.FilterByName(view.Name).Any())
            {
                return false;
            }

            views.Add(view);
            Save(org, service, edition, views);
            return true;
        }

        /// <summary>
        /// The get all ViewMetadata objects for service edition.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>  The list of <see cref="ViewMetadata" />. </returns>
        public IList<ViewMetadata> GetViews(string org, string service, string edition)
        {
            IList<ViewMetadata> result = new List<ViewMetadata>();
            FileInfo file = GetViewMetadataFile(org, service, edition);

            if (file.Exists)
            {
                result = LoadViewMetadata(file);
            }

            return result;
        }

        /// <summary>
        /// Get the view content for a given razor file on disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="name">The name of the RazorView (fileName)</param>
        /// <returns>The content (html/razor) of a Razor View</returns>
        public string GetView(string org, string service, string edition, string name)
        {
            string filename = _settings.GetViewPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + name + ".cshtml";
            return File.ReadAllText(filename, Encoding.UTF8);
        }

        /// <summary>
        /// Save RazorView to disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="name">The name</param>
        /// <param name="html">The view content</param>
        /// <returns>A boolean indicating of storing went ok</returns>
        public bool SaveView(string org, string service, string edition, string name, string html)
        {
            var formDataFilePath = _settings.GetViewPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + name + ".cshtml";

            var file = new FileInfo(formDataFilePath);
            EnsureDirectoryExists(file);

            using (var fileStream = file.Open(FileMode.Create))
            using (var streamWriter = new StreamWriter(fileStream, Encoding.UTF8))
            {
                streamWriter.WriteLine(html);
            }

            return true;
        }

        /// <summary>
        /// The rearrange views.
        /// </summary>
        /// <param name="org">The org.</param>
        /// <param name="service">The service.</param>
        /// <param name="edition">The edition.</param>
        /// <param name="newViewOrder">
        /// The new view order. List containing the old index of the views.
        /// </param>
        public void RearrangeViews(string org, string service, string edition, int[] newViewOrder)
        {
            var views = GetViews(org, service, edition);
            var result = views.Rearrange(newViewOrder);
            Save(org, service, edition, result);
        }

        /// <summary>
        /// Method that deletes view from disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="viewName">The name on config</param>
        /// <returns>True if success, false otherwise</returns>
        public bool DeleteView(string org, string service, string edition, string viewName)
        {
            Guard.AssertArgumentNotNullOrWhiteSpace(viewName, nameof(viewName));

            var views = GetViews(org, service, edition);
            var selected = views.FilterByName(viewName).ToList();
            if (!selected.Any())
            {
                throw new ArgumentException("Invalid view name", nameof(viewName));
            }

            var viewsDirectory = _settings.GetViewPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            foreach (var v in selected)
            {
                var removed = views.Remove(v);
                if (!removed)
                {
                    return false;
                }

                // delete from disk
                var draftFile = new FileInfo(viewsDirectory + $"{v.Name}.cshtml");
                var finalFile = new FileInfo(viewsDirectory + $"{v.Name}final.cshtml");
                if (!draftFile.Exists || !finalFile.Exists)
                {
                    return false;
                }

                draftFile.Delete();
                finalFile.Delete();
            }

            Save(org, service, edition, views);
            return true;
        }

        /// <summary>
        /// Change/Update the name of a view
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="currentName">The current name of the view</param>
        /// <param name="newName">The new name of the View</param>
        /// <returns>True/false is update was successfully</returns>
        public bool UpdateViewName(string org, string service, string edition, string currentName, string newName)
        {
            Guard.AssertArgumentNotNullOrWhiteSpace(currentName, nameof(currentName));
            Guard.AssertArgumentNotNullOrWhiteSpace(newName, nameof(newName));

            var views = GetViews(org, service, edition);
            var selected = views.SingleOrDefault(v => currentName.Equals(v?.Name, StringComparison.CurrentCultureIgnoreCase));
            if (selected == null)
            {
                throw new ArgumentException("View does not exist", nameof(currentName));
            }

            selected.Name = newName;
            Save(GetViewMetadataFile(org, service, edition), views);
            ChangeFileName(org, service, edition, newName, currentName);
            return true;
        }

        private static void Save(FileInfo file, IList<ViewMetadata> viewMetadataList)
        {
            var content = JsonConvert.SerializeObject(viewMetadataList, Formatting.Indented);
            EnsureDirectoryExists(file);

            using (var s = file.Open(FileMode.Create, FileAccess.Write))
            using (var w = new StreamWriter(s, Encoding.UTF8))
            {
                w.WriteLine(content);
            }
        }

        private static void EnsureDirectoryExists(FileInfo file)
        {
            if (!file.Exists && !file.Directory.Exists)
            {
                file.Directory.Create();
            }
        }

        /// <summary>
        /// Change filename
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="newName">The new name of the view.</param>
        /// <param name="currentName">The current name of the view</param>
        private void ChangeFileName(string org, string service, string edition, string newName, string currentName)
        {
            var location = _settings.GetViewPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            string fileExtension = ".cshtml";
            string oldFilePathDraft = location + currentName + fileExtension;
            string oldFilePathFinal = location + currentName + "final" + fileExtension;

            if (File.Exists(oldFilePathDraft) && File.Exists(oldFilePathFinal))
            {
                var newFilePathDraft = location + newName + fileExtension;
                var newFilePtheFinal = location + newName + "final" + fileExtension;
                File.Move(oldFilePathDraft, newFilePathDraft);
                File.Move(oldFilePathFinal, newFilePtheFinal);
            }
        }

        private IList<ViewMetadata> LoadViewMetadata(FileInfo file)
        {
            if (!file.Exists)
            {
                throw new ArgumentException("View metadata file does not exist", nameof(file));
            }

            using (var s = file.OpenRead())
            using (var r = new StreamReader(s, Encoding.UTF8))
            {
                var text = r.ReadToEnd();
                var result = JsonConvert.DeserializeObject<IList<ViewMetadata>>(text);
                return result;
            }
        }

        private FileInfo GetViewMetadataFile(string org, string service, string edition)
        {
            var dir = _settings.GetViewPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            return new FileInfo(dir + _settings.ViewMetadataFileName);
        }

        private void Save(string org, string service, string edition, IList<ViewMetadata> viewMetadataList)
        {
            var file = GetViewMetadataFile(org, service, edition);
            Save(file, viewMetadataList);
        }
    }
}