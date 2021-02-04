using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Linq;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;

using PlatformStorageModels = Altinn.Platform.Storage.Interface.Models;

namespace Designer.Tests.Mocks
{
    public class IRepositoryMock : IRepository
    {
        public bool AddMetadataForAttachment(string org, string app, string applicationMetadata)
        {
            throw new NotImplementedException();
        }

        public void CreateApplicationMetadata(string org, string app, string appTitle)
        {
            throw new NotImplementedException();
        }

        public bool CreateModel(string org, string app, ModelMetadata serviceMetadata, XDocument mainXsd, string fileName)
        {
            throw new NotImplementedException();
        }

        public Task<Repository> CreateService(string org, ServiceConfiguration serviceConfig)
        {
            throw new NotImplementedException();
        }

        public bool CreateServiceMetadata(ModelMetadata serviceMetadata)
        {
            throw new NotImplementedException();
        }

        public void DeleteData(string org, string repo, string path)
        {
            throw new NotImplementedException();
        }

        public bool DeleteLanguage(string org, string app, string id)
        {
            throw new NotImplementedException();
        }

        public bool DeleteMetadataForAttachment(string org, string app, string id)
        {
            throw new NotImplementedException();
        }

        public bool DeleteService(string org, string app)
        {
            throw new NotImplementedException();
        }

        public void DeleteTextResource(string org, string app, string name)
        {
            throw new NotImplementedException();
        }

        public PlatformStorageModels.Application GetApplication(string org, string app)
        {
            throw new NotImplementedException();
        }

        public string GetAppLogic(string org, string app, string fileName)
        {
            throw new NotImplementedException();
        }

        public string GetAppModel(string org, string app)
        {
            throw new NotImplementedException();
        }

        public List<ModelMetadata> GetAvailableApps()
        {
            throw new NotImplementedException();
        }

        public List<AltinnCoreFile> GetCalculationFiles(string org, string app)
        {
            throw new NotImplementedException();
        }

        public string GetConfiguration(string org, string app, string name)
        {
            throw new NotImplementedException();
        }

        public List<FileSystemObject> GetContents(string org, string repository, string path = "")
        {
            throw new NotImplementedException();
        }

        public List<AltinnCoreFile> GetDynamicsFiles(string org, string app)
        {
            throw new NotImplementedException();
        }

        public string GetFileByRelativePath(string org, string app, string fileName)
        {
            throw new NotImplementedException();
        }

        public List<AltinnCoreFile> GetImplementationFiles(string org, string app)
        {
            throw new NotImplementedException();
        }

        public string GetJsonFile(string org, string app, string fileName)
        {
            throw new NotImplementedException();
        }

        public string GetJsonFormLayout(string org, string app)
        {
            throw new NotImplementedException();
        }

        public string GetJsonSchemaModel(string org, string app)
        {
            throw new NotImplementedException();
        }

        public string GetJsonFormLayouts(string org, string app)
        {
            throw new NotImplementedException();
        }

        public string GetJsonThirdPartyComponents(string org, string app)
        {
            throw new NotImplementedException();
        }

        public string GetLanguageResource(string org, string app, string id)
        {
            throw new NotImplementedException();
        }

        public List<string> GetLanguages(string org, string app)
        {
            throw new NotImplementedException();
        }

        public ModelMetadata GetModelMetadata(string org, string app)
        {
            throw new NotImplementedException();
        }

        public IList<OrgConfiguration> GetOwners()
        {
            throw new NotImplementedException();
        }

        public string GetPrefillJson(string org, string app, string dataModelName = "ServiceModel")
        {
            throw new NotImplementedException();
        }

        public string GetResourceFile(string org, string app, string fileName)
        {
            throw new NotImplementedException();
        }

        public string GetRuleHandler(string org, string app)
        {
            throw new NotImplementedException();
        }

        public bool SaveFormLayout(string org, string app, string formLayout, string content)
        {
            throw new NotImplementedException();
        }

        public bool UpdateFormLayoutName(string org, string app, string currentName, string newName)
        {
            throw new NotImplementedException();
        }

        public bool DeleteFormLayout(string org, string app, string formLayout)
        {
            throw new NotImplementedException();
        }

        public bool SaveLayoutSettings(string org, string app, string setting)
        {
            throw new NotImplementedException();
        }

        public string GetLayoutSettings(string org, string app)
        {
            throw new NotImplementedException();
        }

        public byte[] GetServiceResource(string org, string app, string resource)
        {
            throw new NotImplementedException();
        }

        public Dictionary<string, Dictionary<string, string>> GetServiceTexts(string org, string app)
        {
            throw new NotImplementedException();
        }

        public List<AltinnCoreFile> GetValidationFiles(string org, string app)
        {
            throw new NotImplementedException();
        }

        public string GetXsdModel(string org, string app)
        {
            throw new NotImplementedException();
        }

        public Task<Stream> ReadData(string org, string repo, string path)
        {
            throw new NotImplementedException();
        }

        public bool ResetLocalRepository(string org, string repositoryName)
        {
            throw new NotImplementedException();
        }

        public void SaveAppLogicFile(string org, string app, string fileName, string fileContent)
        {
            throw new NotImplementedException();
        }

        public bool SaveConfiguration(string org, string app, string name, string config)
        {
            throw new NotImplementedException();
        }

        public bool SaveFile(string org, string app, string fileName, string fileContent)
        {
            throw new NotImplementedException();
        }

        public bool SaveJsonFile(string org, string app, string resource, string fileName)
        {
            throw new NotImplementedException();
        }

        public bool SaveJsonFormLayout(string org, string app, string resource)
        {
            throw new NotImplementedException();
        }

        public bool SaveJsonThirdPartyComponents(string org, string app, string resource)
        {
            throw new NotImplementedException();
        }

        public bool SaveLanguageResource(string org, string app, string id, string resource)
        {
            throw new NotImplementedException();
        }

        public void SaveResourceFile(string org, string app, string fileName, string fileContent)
        {
            throw new NotImplementedException();
        }

        public bool SaveRuleConfigJson(string org, string app, string resource)
        {
            throw new NotImplementedException();
        }

        public bool SaveRuleHandler(string org, string app, string content)
        {
            throw new NotImplementedException();
        }

        public void SaveServiceTexts(string org, string app, Dictionary<string, Dictionary<string, string>> texts)
        {
            throw new NotImplementedException();
        }

        public bool UpdateApplication(string org, string app, PlatformStorageModels.Application applicationMetadata)
        {
            throw new NotImplementedException();
        }

        public bool UpdateAppTitle(string org, string app, string languageId, string title)
        {
            throw new NotImplementedException();
        }

        public bool UpdateMetadataForAttachment(string org, string app, string applicationMetadata)
        {
            throw new NotImplementedException();
        }

        public bool UpdateModelMetadata(string org, string app, ModelMetadata modelMetadata, string modelName)
        {
            throw new NotImplementedException();
        }

        public bool UpdateServiceInformationInApplication(string org, string app, ServiceConfiguration applicationInformation)
        {
            throw new NotImplementedException();
        }

        public void UpdateViewNameTextResource(string org, string app, string currentName, string newName)
        {
            throw new NotImplementedException();
        }

        public Task WriteData(string org, string repo, string filepath, Stream stream)
        {
            throw new NotImplementedException();
        }

        public string GetWidgetSettings(string org, string app)
        {
            throw new NotImplementedException();
        }

        public bool AddTextResources(string org, string app, List<TextResource> textResourceList)
        {
            throw new NotImplementedException();
        }

        public string GetAppPath(string org, string app)
        {
            throw new NotImplementedException();
        }
    }
}
