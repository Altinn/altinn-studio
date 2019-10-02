using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Extensions;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// The service status view component.
    /// </summary>
    public class ServiceStatusViewComponent : ViewComponent
    {
        private readonly ICompilation _compilation;
        private readonly IRepository _repository;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="ServiceStatusViewComponent"/> class.
        /// </summary>
        /// <param name="compilation">The app compilation service.</param>
        /// <param name="repository">The app repository service.</param>
        /// <param name="generalSettings">the general setting for the repository.</param>
        public ServiceStatusViewComponent(ICompilation compilation, IRepository repository, IOptions<GeneralSettings> generalSettings)
        {
            _compilation = compilation;
            _repository = repository;
            _generalSettings = generalSettings.Value;
        }

        /// <summary>
        /// Invokes the Component async.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="serviceMetadata">The service metadata.</param>
        /// <param name="codeCompilationResult">The code Compilation result.</param>
        /// <returns> The <see cref="Task"/>.  </returns>
        public async Task<IViewComponentResult> InvokeAsync(
            string org,
            string app,
            ServiceMetadata serviceMetadata = null,
            CodeCompilationResult codeCompilationResult = null)
        {
            ServiceIdentifier serviceIdentifier = new ServiceIdentifier { Org = org, Service = app };
            CodeCompilationResult compilation = null;

            if (string.IsNullOrEmpty(_generalSettings.RuntimeMode) || !_generalSettings.RuntimeMode.Equals("ServiceContainer"))
            {
                compilation = codeCompilationResult ?? await Compile(serviceIdentifier);

                var metadata = serviceMetadata ?? await GetServiceMetadata(serviceIdentifier);

                ServiceStatusViewModel model = CreateModel(serviceIdentifier, compilation, metadata);

                return View(model);
            }

            return View(new ServiceStatusViewModel());
        }

        private static IEnumerable<ServiceStatusViewModel.UserMessage> CompilationUserMessages(
            CodeCompilationResult compilation)
        {
            if (compilation == null)
            {
                yield return ServiceStatusViewModel.UserMessage.Error("Kompileringsresultat mangler");
                yield break;
            }

            var errorFiles = NiceSeparatedFileList(compilation.CompilationInfo, c => c.IsError());
            var warningFiles = NiceSeparatedFileList(compilation.CompilationInfo, c => c.IsWarning());

            if (!compilation.Succeeded || !string.IsNullOrWhiteSpace(errorFiles))
            {
                var failed = ServiceStatusViewModel.UserMessage.Error("Tjenesten kompilerer ikke");
                if (!string.IsNullOrWhiteSpace(errorFiles))
                {
                    failed.Details.Add("Filer", errorFiles);
                }

                yield return failed;
            }
            else if (!string.IsNullOrWhiteSpace(warningFiles))
            {
                var warning = ServiceStatusViewModel.UserMessage.Warning("Advarsler ved kompilering");
                warning.Details.Add("Filer", warningFiles);
                yield return warning;
            }
        }

        private static string NiceSeparatedFileList(IEnumerable<CompilationInfo> infos, Func<CompilationInfo, bool> criteria)
        {
            if (infos == null || criteria == null)
            {
                return string.Empty;
            }

            var compilationInfos = infos.Where(criteria).ToList();
            var files =
                compilationInfos.Where(c => !string.IsNullOrWhiteSpace(c?.FileName))
                    .Select(c => c.FileName)
                    .Distinct()
                    .OrderBy(f => f)
                    .ToList();
            if (files.Count <= 2)
            {
                return files.FirstOrDefault() ?? string.Empty;
            }

            return string.Join(", ", files.Take(files.Count - 1)) + " og " + files.Last();
        }

        private static IEnumerable<CompilationInfo> FilterCompilationInfos(CodeCompilationResult codeCompilationResult)
        {
            if (codeCompilationResult?.CompilationInfo == null || codeCompilationResult.CompilationInfo.Any() == false)
            {
                return new CompilationInfo[0];
            }

            var relevante =
                codeCompilationResult.CompilationInfo.Where(RelevantCompilationInfo)
                    .GroupBy(c => c.Severity + c.FileName + c.Info)
                    .Select(c => c.First())
                    .OrderBy(c => c.Severity)
                    .ThenBy(c => c.FileName)
                    .ThenBy(c => c.Info);
            return relevante;
        }

        private static bool RelevantCompilationInfo(CompilationInfo c)
        {
            return (c.IsError() || c.IsWarning()) && !string.IsNullOrEmpty(c.Info) && !string.IsNullOrEmpty(c.FileName);
        }

        private ServiceStatusViewModel CreateModel(
            ServiceIdentifier serviceIdentifier,
            CodeCompilationResult compilationResult,
            ServiceMetadata serviceMetadata)
        {
            var userMessages =
                CompilationUserMessages(compilationResult)
                    .Union(ServiceMetadataMessages(serviceMetadata))
                    .ToList();
            userMessages.Sort();

            return new ServiceStatusViewModel
            {
                ServiceIdentifier = serviceIdentifier,
                CodeCompilationMessages = FilterCompilationInfos(compilationResult).ToList(),
                UserMessages = userMessages,
            };
        }

        private IEnumerable<ServiceStatusViewModel.UserMessage> ServiceMetadataMessages(
            ServiceMetadata serviceMetadata)
        {
            if (serviceMetadata == null)
            {
                yield return ServiceStatusViewModel.UserMessage.Error("Tjenestens metadata mangler");
                yield break;
            }

            var routeParameters =
                new { org = serviceMetadata.Org, app = serviceMetadata.RepositoryName };
            if (serviceMetadata.Elements == null || !serviceMetadata.Elements.Any())
            {
                var dataModellMissing = ServiceStatusViewModel.UserMessage.Error("Tjenestens datamodell mangler");
                dataModellMissing.Link = new KeyValuePair<string, string>(
                                             Url.Action("Index", "Model", routeParameters),
                                             "Til Datamodell");
                yield return dataModellMissing;
            }
        }

        private Task<CodeCompilationResult> Compile(ServiceIdentifier serviceIdentifier)
        {
            Func<CodeCompilationResult> compile =
                () =>
                    _compilation.CreateServiceAssembly(
                        serviceIdentifier.Org,
                        serviceIdentifier.Service,
                        true);
            return Task<CodeCompilationResult>.Factory.StartNew(compile);
        }

        private Task<ServiceMetadata> GetServiceMetadata(ServiceIdentifier serviceIdentifier)
        {
            Func<ServiceMetadata> fetchServiceMetadata =
                () =>
                    _repository.GetServiceMetaData(
                        serviceIdentifier.Org,
                        serviceIdentifier.Service);
            return Task<ServiceMetadata>.Factory.StartNew(fetchServiceMetadata);
        }
    }
}
