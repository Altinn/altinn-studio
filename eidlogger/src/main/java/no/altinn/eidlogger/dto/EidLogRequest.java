package no.altinn.eidlogger.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.Map;

@Getter
@Setter
public class EidLogRequest {
  private String eventName;
  private Instant eventCreated;
  private String eventDescription;
  private String correlationId;
  private String kafkaTopicDestination;
  private String applicationName;
  private String applicationEnvironment;
  private String eventActorId;
  private String eventSubjectPid;
  private String serviceProviderId;
  private String serviceProviderOrgno;
  private String serviceProviderName;
  private String serviceOwnerId;
  private String serviceOwnerOrgno;
  private String serviceOwnerName;
  private String authEid;
  private String authMethod;

}
