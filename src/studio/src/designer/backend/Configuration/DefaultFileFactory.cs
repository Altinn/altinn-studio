using System.IO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// The default file factory. See <see cref="IDefaultFileFactory"/>
    /// </summary>
    public class DefaultFileFactory : IDefaultFileFactory
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly IWebHostEnvironment _hostingEnvironment;

        /// <summary>
        /// Initializes a new instance of the <see cref="DefaultFileFactory"/> class.
        /// </summary>
        /// <param name="repositorySettings"> The service repository settings. </param>
        /// <param name="hostingEnvironment"> The hosting environment. </param>
        public DefaultFileFactory(IOptions<ServiceRepositorySettings> repositorySettings, IWebHostEnvironment hostingEnvironment)
        {
            _settings = repositorySettings.Value;
            _hostingEnvironment = hostingEnvironment;
        }

        /// <summary>
        /// The get default file.
        /// </summary>
        /// <param name="fileName">The file name.</param>
        /// <param name="org">The org.</param>
        /// <returns> The <see cref="FileInfo"/>. This method does not check if the file exist. </returns>
        public FileInfo GetJsonDefaultFile(string fileName, string org = null)
        {
            if (!string.IsNullOrEmpty(org))
            {
                var orgPath = _settings.GetOrgPath(org) + "defaults/";
                var orgDefaultFile = new FileInfo(orgPath + fileName);
                if (orgDefaultFile.Exists)
                {
                    return orgDefaultFile;
                }
            }

            // Hosting environment er systemkomponent, så den følger ikke konvensjoner ellers i ServiceRepositorySettings fila, med "/" som path separator.
            var globalDefaultPath = new FileInfo(Path.Combine(_hostingEnvironment.WebRootPath, "designer", "json", "defaults", fileName));

            return globalDefaultPath;
        }

        /// <inheritdoc/>
        public FileInfo GetWebAppDefaultFile(string fileName, string org = null)
        {
            if (!string.IsNullOrEmpty(org))
            {
                var orgPath = _settings.GetOrgPath(org) + "defaults/";
                var orgDefaultFile = new FileInfo(orgPath + fileName);
                if (orgDefaultFile.Exists)
                {
                    return orgDefaultFile;
                }
            }

            // Hosting environment er systemkomponent, så den følger ikke konvensjoner ellers i ServiceRepositorySettings fila, med "/" som path separator.
            var globalDefaultPath = new FileInfo(Path.Combine(_hostingEnvironment.WebRootPath, "designer", "js", "react", fileName));

            return globalDefaultPath;
        }

        /// <inheritdoc/>
        public FileInfo GetWebAppStyleDefaultFile(string fileName, string org = null)
        {
            if (!string.IsNullOrEmpty(org))
            {
                var orgPath = _settings.GetOrgPath(org) + "defaults/";
                var orgDefaultFile = new FileInfo(orgPath + fileName);
                if (orgDefaultFile.Exists)
                {
                    return orgDefaultFile;
                }
            }

            // Hosting environment er systemkomponent, så den følger ikke konvensjoner ellers i ServiceRepositorySettings fila, med "/" som path separator.
            var globalDefaultPath = new FileInfo(Path.Combine(_hostingEnvironment.WebRootPath, "designer", "css", "react", fileName));

            return globalDefaultPath;
        }
    }
}
