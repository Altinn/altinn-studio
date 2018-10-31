
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Extensions;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// The service status view component.
    /// </summary>
    public class EditionStatusViewComponent : ViewComponent
    {
        private readonly ICompilation _compilation;
        private readonly IRepository _repository;
        private readonly IViewRepository _viewRepository;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="EditionStatusViewComponent"/> class.
        /// </summary>
        /// <param name="compilation"> The service compilation service.  </param>
        /// <param name="repository"> The service Repository Service. </param>
        /// <param name="viewRepository">The view repository</param>
        public EditionStatusViewComponent(ICompilation compilation, IRepository repository, IViewRepository viewRepository,
            IOptions<GeneralSettings> generalSettings)
        {
            _compilation = compilation;
            _repository = repository;
            _viewRepository = viewRepository;
            _generalSettings = generalSettings.Value;
        }

        /// <summary>
        /// The invokes the Component async.
        /// </summary>
        /// <param name="org"> The org. </param>
        /// <param name="service"> The service. </param>
        /// <param name="edition"> The edition. </param>
        /// <param name="serviceMetadata"> The service Metadata. </param>
        /// <param name="viewMetadatas">The view metadata list</param>
        /// <param name="codeCompilationResult"> The code Compilation Result. </param>
        /// <returns> The <see cref="Task"/>.  </returns>
        public async Task<IViewComponentResult> InvokeAsync(
            string org,
            string service,
            string edition,
            ServiceMetadata serviceMetadata = null,
            IList<ViewMetadata> viewMetadata = null,
            CodeCompilationResult codeCompilationResult = null)
        {
            ServiceEditionIdentifier serviceEdition = new ServiceEditionIdentifier { Org = org, Service = service, Edition = edition };
            CodeCompilationResult compilation = null;

            if (string.IsNullOrEmpty(_generalSettings.RuntimeMode) || !_generalSettings.RuntimeMode.Equals("ServiceContainer"))
            {
                compilation =  codeCompilationResult ?? await Compile(serviceEdition);
        

            var metadata = serviceMetadata ?? await GetServiceMetadata(serviceEdition);

            EditionStatusViewModel model = CreateModel(serviceEdition, compilation, metadata);

            return View(model);

            }

            return View(new EditionStatusViewModel());
        }

        private static IEnumerable<EditionStatusViewModel.UserMessage> CompilationUserMessages(
            CodeCompilationResult compilation)
        {
            if (compilation == null)
            {
                yield return EditionStatusViewModel.UserMessage.Error("Kompileringsresultat mangler");
                yield break;
            }

            var errorFiles = NiceSeparatedFileList(compilation.CompilationInfo, c => c.IsError());
            var warningFiles = NiceSeparatedFileList(compilation.CompilationInfo, c => c.IsWarning());

            if (!compilation.Succeeded || !string.IsNullOrWhiteSpace(errorFiles))
            {
                var failed = EditionStatusViewModel.UserMessage.Error("Tjenesten kompilerer ikke");
                if (!string.IsNullOrWhiteSpace(errorFiles))
                {
                    failed.Details.Add("Filer", errorFiles);
                }

                yield return failed;
            }
            else if (!string.IsNullOrWhiteSpace(warningFiles))
            {
                var warning = EditionStatusViewModel.UserMessage.Warning("Advarsler ved kompilering");
                warning.Details.Add("Filer", warningFiles);
                yield return warning;
            }
        }

        private static string NiceSeparatedFileList( IEnumerable<CompilationInfo> infos, Func<CompilationInfo, bool> criteria)
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
                    .ToList()
                    .OrderBy(c => c.Severity)
                    .ThenBy(c => c.FileName)
                    .ThenBy(c => c.Info);
            return relevante;
        }

        private static bool RelevantCompilationInfo(CompilationInfo c)
        {
            return (c.IsError() || c.IsWarning()) && !string.IsNullOrEmpty(c.Info) && !string.IsNullOrEmpty(c.FileName);
        }

        private EditionStatusViewModel CreateModel(
            ServiceEditionIdentifier serviceEditionIdentifier,
            CodeCompilationResult compilationResult,
            ServiceMetadata serviceMetadata
            )
        {
            var userMessages =
                CompilationUserMessages(compilationResult)
                    .Union(ServiceMetadataMessages(serviceMetadata))
                    .ToList();
            userMessages.Sort();

            return new EditionStatusViewModel
                       {
                           EditionIdentifier = serviceEditionIdentifier,
                           CodeCompilationMessages = FilterCompilationInfos(compilationResult).ToList(),
                           UserMessages = userMessages
                       };
        }

        private IEnumerable<EditionStatusViewModel.UserMessage> ServiceMetadataMessages(
            ServiceMetadata serviceMetadata)
        {
            if (serviceMetadata == null)
            {
                yield return EditionStatusViewModel.UserMessage.Error("Tjenestens metadata mangler");
                yield break;
            }

            var routParameters =
                new { org = serviceMetadata.Org, service = serviceMetadata.Service, edition = serviceMetadata.Edition };
            if (serviceMetadata.Elements == null || !serviceMetadata.Elements.Any())
            {
                var dataModellMissing = EditionStatusViewModel.UserMessage.Error("Tjenestens datamodell mangler");
                dataModellMissing.Link = new KeyValuePair<string, string>(
                                             Url.Action("Index", "Model", routParameters),
                                             "Til Datamodell");
                yield return dataModellMissing;
            }
        }

        private Task<CodeCompilationResult> Compile(ServiceEditionIdentifier serviceEdition)
        {
            Func<CodeCompilationResult> compile =
                () =>
                    _compilation.CreateServiceAssembly(
                        serviceEdition.Org,
                        serviceEdition.Service,
                        serviceEdition.Edition);
            return Task<CodeCompilationResult>.Factory.StartNew(compile);
        }

        private Task<ServiceMetadata> GetServiceMetadata(ServiceEditionIdentifier serviceEdition)
        {
            Func<ServiceMetadata> fetchServiceMetadata =
                () =>
                    _repository.GetServiceMetaData(
                        serviceEdition.Org,
                        serviceEdition.Service,
                        serviceEdition.Edition);
            return Task<ServiceMetadata>.Factory.StartNew(fetchServiceMetadata);
        }
    }
}