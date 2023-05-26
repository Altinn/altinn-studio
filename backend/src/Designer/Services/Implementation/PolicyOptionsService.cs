using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using PolicyAdmin.Models;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class PolicyOptionsService : IPolicyOptions
    {
        public async Task<List<ActionOption>> GetActionOptions()
        {
            string filename = Path.Join(GetOptionsPath(),"actionoptions.json");
            try
            {
                if (File.Exists(filename))
                {
                    JsonSerializerOptions jsonSerializerOptions = new JsonSerializerOptions()
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        PropertyNameCaseInsensitive = true,
                        AllowTrailingCommas = true
                    };
                    using FileStream fileStream = File.OpenRead(filename);
                    var actionOptions = await JsonSerializer.DeserializeAsync<List<ActionOption>>(fileStream, jsonSerializerOptions);
                    if (actionOptions == null)
                    {
                        throw new Exception($"Deserialization returned null, Could indicate problems with deserialization of {filename}");
                    }

                    return actionOptions;
                }

                throw new Exception($"Unable to locate application metadata file: {filename}");
            }
            catch (JsonException ex)
            {
                throw new Exception($"Something went wrong when parsing application metadata file: {filename}", ex);
            }
        }


        public async Task<List<SubjectOption>> GetSubjectOptions()
        {
            string filename = Path.Join(GetOptionsPath(), "subjectoptions.json");
            try
            {
                if (File.Exists(filename))
                {
                    JsonSerializerOptions jsonSerializerOptions = new JsonSerializerOptions()
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        PropertyNameCaseInsensitive = true,
                        AllowTrailingCommas = true
                    };
                    using FileStream fileStream = File.OpenRead(filename);
                    var actionOptions = await JsonSerializer.DeserializeAsync<List<SubjectOption>>(fileStream, jsonSerializerOptions);
                    if (actionOptions == null)
                    {
                        throw new Exception($"Deserialization returned null, Could indicate problems with deserialization of {filename}");
                    }

                    return actionOptions;
                }

                throw new Exception($"Unable to locate application metadata file: {filename}");
            }
            catch (JsonException ex)
            {
                throw new Exception($"Something went wrong when parsing application metadata file: {filename}", ex);
            }
        }

        private string GetOptionsPath()
        {
            string configTest = Path.GetDirectoryName(new Uri(typeof(PolicyOptionsService).Assembly.Location).LocalPath);
            return Path.Combine(configTest, "Authorization");
        }
    }
}
