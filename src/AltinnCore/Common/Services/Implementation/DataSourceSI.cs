using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
	/// <summary>
	/// This service will be handling the external JSON REST API's
	/// </summary>
	public class DataSourceSI : IDataSourceService
	{
		private readonly IDefaultFileFactory _defaultFileFactory;
		private readonly ServiceRepositorySettings _settings;
		private readonly IHttpContextAccessor _httpContextAccessor;

		/// <summary>
		/// Initializes a new instance of the <see cref="DataSourceSI"/> class.
		/// </summary>
		/// <param name="defaultFileFactory">Pass in IDefaultFileFactory interface as a parameter.</param>
		/// <param name="repositorySettings">Pass in IOptions interface as a parameter.</param>
		public DataSourceSI(IDefaultFileFactory defaultFileFactory, IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor)
		{
			_defaultFileFactory = defaultFileFactory;
			_settings = repositorySettings.Value;
			_httpContextAccessor = httpContextAccessor;
		}

		/// <summary>
		/// Get a list of stored rest URL's
		/// </summary>
		/// <param name="org">The Organization code for the service owner</param>
		/// <param name="service">The service code for the current service</param>
		/// <returns>Returns a list of DataSourceModel objects.</returns>
		public IList<DataSourceModel> GetDatasources(string org, string service)
		{
			var fileName = _settings.GetDataSourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + "jsonUrl.json";
			var file = new FileInfo(fileName);
			if (!file.Exists)
			{
				return new List<DataSourceModel>();
			}

			using (var sr = file.OpenText())
			{
				var rawString = sr.ReadToEnd();
				var data = JsonConvert.DeserializeObject<RootObject>(rawString);
				var resultData = data?.UrlResources?.DataSourceUrls?.Values;
				return resultData != null ? resultData.ToList() : new List<DataSourceModel>();
			}
		}

		/// <summary>
		/// Save the data to disk
		/// </summary>
		/// <param name="org">The Organization code for the service owner</param>
		/// <param name="service">The service code for the current service</param>
		/// <param name="name">File name</param>
		/// <param name="url">The rest URL to be saved</param>
		/// <returns>True if save successful</returns>
		public bool Save(string org, string service, string name, string url)
		{
			try
			{
				var filePath = GetFilePath(org, service);
				if (!filePath.Exists)
				{
					EnsureDirectoryExists(filePath);
				}

				using (var s = filePath.Open(FileMode.Create))
				using (var sw = new StreamWriter(s, Encoding.UTF8))
				{
					sw.WriteLine(url ?? string.Empty);
				}
			}
			catch
			{
				return false;
			}

			return true;
		}

		/// <summary>
		/// Delete object from JSON
		/// </summary>
		/// <param name="org">The Organization code for the service owner</param>
		/// <param name="service">The service code for the current service</param>
		/// <param name="id">The data source id</param>
		/// <returns>True of datasource was found and deleted</returns>
		public bool Delete(string org, string service, string id)
		{
			if (id == null)
			{
				return false;
			}

			FileInfo file = GetFilePath(org, service);
			RootObject root = GetDataSourceRoot(file);
			root.UrlResources.DataSourceUrls.Remove(id);

			Save(file, root);

			return true;
		}

		/// <summary>
		/// Creating the data source 
		/// </summary>
		/// <param name="org">The Organization code for the service owner</param>
		/// <param name="service">The service code for the current service</param>
		/// <param name="description">Description of the URL.</param>
		/// <param name="url">The rest url field.</param>
		/// <returns>Returns a DataSourceModel</returns>
		public DataSourceModel Create(string org, string service, string description, string url)
		{
			var file = GetFilePath(org, service);
			var dataSourceModel = GetDataSourceRoot(file);

			var newItem = new DataSourceModel
			{
				Id = GetNextId(dataSourceModel).ToString(),
				Description = description,
				Url = url,
				Opprettet = DateTime.Now
			};

			dataSourceModel.UrlResources.DataSourceUrls.Add(newItem.Id, newItem);
			Save(file, dataSourceModel);
			return newItem;
		}

		/// <summary>
		/// Update the file.
		/// </summary>
		/// <param name="org">The Organization code for the service owner</param>
		/// <param name="service">The service code for the current service</param>
		/// <param name="model">Reference to the DataSourceModel</param>
		public void Update(string org, string service, DataSourceModel model)
		{
			if (string.IsNullOrWhiteSpace(model?.Id))
			{
				throw new ArgumentException("Id missin'", nameof(model));
			}

			var file = GetFilePath(org, service);
			var root = GetDataSourceRoot(file);
			var current = root?.UrlResources?.DataSourceUrls.Single(x => x.Value?.Id == model.Id);
			if (current?.Value == null || string.IsNullOrEmpty(current?.Key))
			{
				throw new Exception("Finner ikke " + model.Id);
			}

			root.UrlResources.DataSourceUrls[current?.Key] = model;
			Save(file, root);
		}

		public async Task<string> TestRestApi(string url)
		{
			using (HttpClient client = new HttpClient())
			using (HttpResponseMessage response = await client.GetAsync(url))
			using (HttpContent content = response.Content)
			{
				string result = await content.ReadAsStringAsync();
				var json = JsonConvert.DeserializeObject(result);
				//var generateClasses = new JsonToCsharpClass();
				//generateClasses.CreateClass(json);
				return JsonConvert.SerializeObject(json, Formatting.Indented);
			}
		}

		/// <summary>
		/// Get the next Id.
		/// </summary>
		/// <param name="rootObject">The JSON object</param>
		/// <returns>new Id.</returns>
		private static int GetNextId(RootObject rootObject)
		{
			if (rootObject?.UrlResources == null)
			{
				return 1;
			}

			var value = 0;
			foreach (var pair in rootObject.UrlResources.DataSourceUrls)
			{
				if (!string.IsNullOrEmpty(pair.Value?.Id) && int.TryParse(pair.Value.Id, out int tmp) && tmp > value)
				{
					value = tmp;
				}
			}

			return value + 1;
		}

		/// <summary>
		/// Check to see if the Directory exits.
		/// </summary>
		/// <param name="fileInfo">Path to the file directory</param>
		private static void EnsureDirectoryExists(FileInfo fileInfo)
		{
			if (!fileInfo.Directory.Exists)
			{
				fileInfo.Directory.Create();
			}
		}

		/// <summary>
		/// Save the JSON to disk.
		/// </summary>
		/// <param name="file">The file.</param>
		/// <param name="rootObject">the JSON object</param>
		private static void Save(FileInfo file, RootObject rootObject)
		{
			if (!file.Exists)
			{
				EnsureDirectoryExists(file);
			}

			var serialized = JsonConvert.SerializeObject(rootObject, Formatting.Indented);

			using (var s = file.Open(FileMode.Create))
			using (var sr = new StreamWriter(s, Encoding.UTF8))
			{
				sr.WriteLine(serialized);
			}
		}

		/// <summary>
		/// Load the JSON object into memory.
		/// </summary>
		/// <param name="fileInfo">The file.</param>
		/// <returns>JSON object</returns>
		private static RootObject LoadDataSourceRoot(FileInfo fileInfo)
		{
			using (var s = fileInfo.OpenRead())
			using (var fs = new StreamReader(s, Encoding.UTF8))
			{
				var rawText = fs.ReadToEnd();
				var result = JsonConvert.DeserializeObject<RootObject>(rawText);
				return result;
			}
		}

		/// <summary>
		/// Create an empty JSON object.
		/// </summary>
		/// <returns>An empty JSON object.</returns>
		private static RootObject CreateNewEmptyDataSourceRoot()
		{
			return new RootObject
			{
				UrlResources = new UrlResources
				{
					DataSourceUrls = new Dictionary<string, DataSourceModel>()
				}
			};
		}

		/// <summary>
		/// Get the file path
		/// </summary>
		/// <param name="org">The Organization code for the service owner</param>
		/// <param name="service">The service code for the current service</param>
		/// <returns>FileInfo object with the path to the JSON file.</returns>
		private FileInfo GetFilePath(string org, string service)
		{
			string filePath = null;
			if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
			{
				filePath = $"{Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")}{org}";
			}
			else
			{
				filePath = $"{_settings.RepositoryLocation}{org}";
			}


			if (!string.IsNullOrEmpty(service))
			{
				filePath += "/" + service;
			}
			else
			{
				filePath += "/" + org;
			}

			filePath += $"/DataSource/jsonUrl.json";
			return new FileInfo(filePath);
		}

		/// <summary>
		/// Load the file from disk or create it if not.
		/// </summary>
		/// <param name="file">The file.</param>
		/// <returns>JSON object</returns>
		private RootObject GetDataSourceRoot(FileInfo file)
		{
			var result = file.Exists ? LoadDataSourceRoot(file) : CreateNewEmptyDataSourceRoot();
			return result;
		}
	}
}
