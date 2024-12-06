package no.altinn.eidlogger.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
public class EidLogRequest {
  private String eventName;
  private Instant eventCreated;
  private String eventDescription;
  private HashMap<String, String> studioData;
}
