package altinn.platform.pdf.services;

import java.util.logging.Level;
import java.util.logging.Logger;

public class BasicLogger {
  private static Logger logger;

  private BasicLogger() {
    if (logger == null) {
      logger = Logger.getLogger(BasicLogger.class.getName());
    }
  }

  private static Logger getLogger() {
    if (logger == null) {
      new BasicLogger();
    }
    return logger;
  }

  public static void log(Level level, String message) {
    Logger logger = getLogger();
    if (logger != null) {
      logger.log(level, message);
    }
  }
}
