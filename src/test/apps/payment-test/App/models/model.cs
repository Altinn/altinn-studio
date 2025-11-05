using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace Altinn.App.Models
{
  [XmlRoot(ElementName="form")]
  public class Form
  {
    [XmlElement("ContactInformation", Order = 1)]
    [JsonProperty("ContactInformation")]
    [JsonPropertyName("ContactInformation")]
    public ContactInformation ContactInformation { get; set; }

    [XmlElement("AgentPerson", Order = 2)]
    [JsonProperty("AgentPerson")]
    [JsonPropertyName("AgentPerson")]
    public string AgentPerson { get; set; }

    [XmlElement("AgentCompany", Order = 3)]
    [JsonProperty("AgentCompany")]
    [JsonPropertyName("AgentCompany")]
    public CompanyProperties AgentCompany { get; set; }

    [XmlElement("Company", Order = 4)]
    [JsonProperty("Company")]
    [JsonPropertyName("Company")]
    public Company Company { get; set; }

    [XmlElement("Trademark", Order = 5)]
    [JsonProperty("Trademark")]
    [JsonPropertyName("Trademark")]
    public Trademark Trademark { get; set; }

    [XmlElement("GoodsAndServicesProperties", Order = 6)]
    [JsonProperty("GoodsAndServicesProperties")]
    [JsonPropertyName("GoodsAndServicesProperties")]
    public GoodsAndServicesProperties GoodsAndServicesProperties { get; set; }

    [XmlElement("PreInvestigation", Order = 7)]
    [JsonProperty("PreInvestigation")]
    [JsonPropertyName("PreInvestigation")]
    public PreInvestigation PreInvestigation { get; set; }

    [XmlElement("SimilarTrademarks", Order = 8)]
    [JsonProperty("SimilarTrademarks")]
    [JsonPropertyName("SimilarTrademarks")]
    public SimilarTrademarks SimilarTrademarks { get; set; }

    [XmlElement("HideFirstPaymentDetails", Order = 9)]
    [JsonProperty("HideFirstPaymentDetails")]
    [JsonPropertyName("HideFirstPaymentDetails")]
    public bool? HideFirstPaymentDetails { get; set; }

    [XmlElement("HF_HaveReadAndUnderstood", Order = 10)]
    [JsonProperty("HF_HaveReadAndUnderstood")]
    [JsonPropertyName("HF_HaveReadAndUnderstood")]
    public bool? HF_HaveReadAndUnderstood { get; set; }

    public bool ShouldSerializeHF_HaveReadAndUnderstood()
    {
      return HF_HaveReadAndUnderstood.HasValue;
    }

  }

  public class ContactInformation
  {
    [XmlElement("FullName", Order = 1)]
    [JsonProperty("FullName")]
    [JsonPropertyName("FullName")]
    public string FullName { get; set; }

    [XmlElement("PhoneNumber", Order = 2)]
    [JsonProperty("PhoneNumber")]
    [JsonPropertyName("PhoneNumber")]
    public string PhoneNumber { get; set; }

    [XmlElement("Email", Order = 3)]
    [JsonProperty("Email")]
    [JsonPropertyName("Email")]
    public string Email { get; set; }

    [XmlElement("Reference", Order = 4)]
    [JsonProperty("Reference")]
    [JsonPropertyName("Reference")]
    public string Reference { get; set; }

  }

  public class CompanyProperties
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId()
    {
      return AltinnRowId != default;
    }

    [XmlElement("CompanyNumber", Order = 1)]
    [JsonProperty("CompanyNumber")]
    [JsonPropertyName("CompanyNumber")]
    public string CompanyNumber { get; set; }

    [XmlElement("CompanyName", Order = 2)]
    [JsonProperty("CompanyName")]
    [JsonPropertyName("CompanyName")]
    public string CompanyName { get; set; }

    [XmlElement("FirstName", Order = 3)]
    [JsonProperty("FirstName")]
    [JsonPropertyName("FirstName")]
    public string FirstName { get; set; }

    [XmlElement("LastName", Order = 4)]
    [JsonProperty("LastName")]
    [JsonPropertyName("LastName")]
    public string LastName { get; set; }

    [XmlElement("StreetAddress", Order = 5)]
    [JsonProperty("StreetAddress")]
    [JsonPropertyName("StreetAddress")]
    public string StreetAddress { get; set; }

    [XmlElement("ZipCode", Order = 6)]
    [JsonProperty("ZipCode")]
    [JsonPropertyName("ZipCode")]
    public string ZipCode { get; set; }

    [XmlElement("City", Order = 7)]
    [JsonProperty("City")]
    [JsonPropertyName("City")]
    public string City { get; set; }

    [XmlElement("Country", Order = 8)]
    [JsonProperty("Country")]
    [JsonPropertyName("Country")]
    public string Country { get; set; }

    [XmlElement("ClientNumber", Order = 9)]
    [JsonProperty("ClientNumber")]
    [JsonPropertyName("ClientNumber")]
    public string ClientNumber { get; set; }

  }

  public class Company
  {
    [XmlElement("CompanyProperties", Order = 1)]
    [JsonProperty("CompanyProperties")]
    [JsonPropertyName("CompanyProperties")]
    public List<CompanyProperties> CompanyProperties { get; set; }

  }

  public class Trademark
  {
    [XmlElement("TrademarkType", Order = 1)]
    [JsonProperty("TrademarkType")]
    [JsonPropertyName("TrademarkType")]
    public string TrademarkType { get; set; }

    [XmlElement("TrademarkText", Order = 2)]
    [JsonProperty("TrademarkText")]
    [JsonPropertyName("TrademarkText")]
    public string TrademarkText { get; set; }

    [XmlElement("TrademarkDetails", Order = 3)]
    [JsonProperty("TrademarkDetails")]
    [JsonPropertyName("TrademarkDetails")]
    public string TrademarkDetails { get; set; }

  }

  public class GoodsAndServicesProperties
  {
    [XmlElement("Inventory", Order = 1)]
    [JsonProperty("Inventory")]
    [JsonPropertyName("Inventory")]
    public Inventory Inventory { get; set; }

    [XmlElement("Details", Order = 2)]
    [JsonProperty("Details")]
    [JsonPropertyName("Details")]
    public string Details { get; set; }

  }

  public class Inventory
  {
    [XmlElement("InventoryProperties", Order = 1)]
    [JsonProperty("InventoryProperties")]
    [JsonPropertyName("InventoryProperties")]
    public List<InventoryProperties> InventoryProperties { get; set; }

  }

  public class InventoryProperties
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId()
    {
      return AltinnRowId != default;
    }

    [XmlElement("NiceClassification", Order = 1)]
    [JsonProperty("NiceClassification")]
    [JsonPropertyName("NiceClassification")]
    public string NiceClassification { get; set; }

    [XmlElement("GoodsAndServices", Order = 2)]
    [JsonProperty("GoodsAndServices")]
    [JsonPropertyName("GoodsAndServices")]
    public string GoodsAndServices { get; set; }

  }

  public class PreInvestigation
  {
    [XmlElement("HF_HasPriority", Order = 1)]
    [JsonProperty("HF_HasPriority")]
    [JsonPropertyName("HF_HasPriority")]
    public bool? HF_HasPriority { get; set; }

    public bool ShouldSerializeHF_HasPriority()
    {
      return HF_HasPriority.HasValue;
    }

    [XmlElement("HF_HasEarlierInvestigation", Order = 2)]
    [JsonProperty("HF_HasEarlierInvestigation")]
    [JsonPropertyName("HF_HasEarlierInvestigation")]
    public bool? HF_HasEarlierInvestigation { get; set; }

    public bool ShouldSerializeHF_HasEarlierInvestigation()
    {
      return HF_HasEarlierInvestigation.HasValue;
    }

    [XmlElement("Year", Order = 3)]
    [JsonProperty("Year")]
    [JsonPropertyName("Year")]
    public string Year { get; set; }

    [XmlElement("Number", Order = 4)]
    [JsonProperty("Number")]
    [JsonPropertyName("Number")]
    public string Number { get; set; }

    [XmlElement("Priority", Order = 5)]
    [JsonProperty("Priority")]
    [JsonPropertyName("Priority")]
    public Priority Priority { get; set; }

  }

  public class Priority
  {
    [XmlElement("PriorityReason", Order = 1)]
    [JsonProperty("PriorityReason")]
    [JsonPropertyName("PriorityReason")]
    public string PriorityReason { get; set; }

    [XmlElement("PriorityProperties", Order = 2)]
    [JsonProperty("PriorityProperties")]
    [JsonPropertyName("PriorityProperties")]
    public List<PriorityProperties> PriorityProperties { get; set; }

  }

  public class PriorityProperties
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId()
    {
      return AltinnRowId != default;
    }

    [XmlElement("PriorityDate", Order = 1)]
    [JsonProperty("PriorityDate")]
    [JsonPropertyName("PriorityDate")]
    public string PriorityDate { get; set; }

    [XmlElement("CaseDate", Order = 2)]
    [JsonProperty("CaseDate")]
    [JsonPropertyName("CaseDate")]
    public string CaseDate { get; set; }

    [XmlElement("CaseName", Order = 3)]
    [JsonProperty("CaseName")]
    [JsonPropertyName("CaseName")]
    public string CaseName { get; set; }

    [XmlElement("InternationalDischargeDate", Order = 4)]
    [JsonProperty("InternationalDischargeDate")]
    [JsonPropertyName("InternationalDischargeDate")]
    public string InternationalDischargeDate { get; set; }

    [XmlElement("InternationalRegistrationNumber", Order = 5)]
    [JsonProperty("InternationalRegistrationNumber")]
    [JsonPropertyName("InternationalRegistrationNumber")]
    public string InternationalRegistrationNumber { get; set; }

    [XmlElement("CountryCode", Order = 6)]
    [JsonProperty("CountryCode")]
    [JsonPropertyName("CountryCode")]
    public string CountryCode { get; set; }

    [XmlElement("RegistrationNumber", Order = 7)]
    [JsonProperty("RegistrationNumber")]
    [JsonPropertyName("RegistrationNumber")]
    public string RegistrationNumber { get; set; }

    [XmlElement("NiceClassification", Order = 8)]
    [JsonProperty("NiceClassification")]
    [JsonPropertyName("NiceClassification")]
    public string NiceClassification { get; set; }

    [XmlElement("Reference", Order = 9)]
    [JsonProperty("Reference")]
    [JsonPropertyName("Reference")]
    public string Reference { get; set; }

  }

  public class SimilarTrademarks
  {
    [XmlElement("SearchResult", Order = 1)]
    [JsonProperty("SearchResult")]
    [JsonPropertyName("SearchResult")]
    public List<SearchResult> SearchResult { get; set; }

    [XmlElement("SearchServiceLink", Order = 2)]
    [JsonProperty("SearchServiceLink")]
    [JsonPropertyName("SearchServiceLink")]
    public string SearchServiceLink { get; set; }

  }

  public class SearchResult
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId()
    {
      return AltinnRowId != default;
    }

    [XmlElement("TrademarkText", Order = 1)]
    [JsonProperty("TrademarkText")]
    [JsonPropertyName("TrademarkText")]
    public string TrademarkText { get; set; }

    [XmlElement("ApplicationNumber", Order = 2)]
    [JsonProperty("ApplicationNumber")]
    [JsonPropertyName("ApplicationNumber")]
    public string ApplicationNumber { get; set; }

    [XmlElement("GoodsAndServicesClassNumber", Order = 3)]
    [JsonProperty("GoodsAndServicesClassNumber")]
    [JsonPropertyName("GoodsAndServicesClassNumber")]
    public string GoodsAndServicesClassNumber { get; set; }

    [XmlElement("Status", Order = 4)]
    [JsonProperty("Status")]
    [JsonPropertyName("Status")]
    public string Status { get; set; }

  }
}
