"""MLflow tracking utilities"""
import mlflow
from shared.config.base_config import get_config
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)
config = get_config()

_initialized = False


def init_mlflow():
    """Initialize MLflow with proper configuration"""
    try:
        # Disable automatic tracing to prevent multiple traces
        import mlflow
        # Disable all auto-logging for LLM providers that might create separate traces
        mlflow.openai.autolog(disable=True)
        mlflow.langchain.autolog(disable=True) 
        try:
            mlflow.llamaindex.autolog(disable=True)
        except:
            pass  # llamaindex might not be available
        try:
            mlflow.anthropic.autolog(disable=True)
        except:
            pass  # anthropic might not be available
        mlflow.autolog(disable=True)  # Disable general auto-logging
    except Exception as e:
        log.warning(f"Failed to disable MLflow auto-tracking/logging: {e}")
    
    global _initialized
    
    if _initialized:
        log.debug("MLflow already initialized")
        return
    
    if not config.MLFLOW_ENABLED:
        log.info("MLflow tracking is disabled")
        return
    
    try:
        # Set tracking URI
        mlflow.set_tracking_uri(config.MLFLOW_TRACKING_URI)
        log.info(f"MLflow tracking URI set to: {config.MLFLOW_TRACKING_URI}")
        
        # Create or get experiment
        try:
            experiment = mlflow.get_experiment_by_name(config.MLFLOW_EXPERIMENT_NAME)
            if experiment is None:
                experiment_id = mlflow.create_experiment(config.MLFLOW_EXPERIMENT_NAME)
                log.info(f"Created new MLflow experiment: {config.MLFLOW_EXPERIMENT_NAME} (ID: {experiment_id})")
            else:
                log.info(f"Using existing MLflow experiment: {config.MLFLOW_EXPERIMENT_NAME} (ID: {experiment.experiment_id})")
            
            # Set the experiment as active
            mlflow.set_experiment(config.MLFLOW_EXPERIMENT_NAME)
            log.info(f"Active MLflow experiment set to: {config.MLFLOW_EXPERIMENT_NAME}")
            
        except Exception as e:
            log.warning(f"Could not create/get experiment: {e}. Will create on first run.")
        
        _initialized = True
        log.info("MLflow initialized successfully")
        
    except Exception as e:
        log.error(f"Failed to initialize MLflow: {e}")
        log.warning("MLflow tracking will be disabled")


def is_mlflow_enabled() -> bool:
    """Check if MLflow tracking is enabled and initialized"""
    return config.MLFLOW_ENABLED and _initialized


def get_or_create_experiment(experiment_name: str = None) -> str:
    """Get or create an MLflow experiment and return its name"""
    # Force initialization if not done
    if not _initialized:
        initialize_mlflow()
    
    if not is_mlflow_enabled():
        log.warning("MLflow not enabled, cannot create experiment")
        return None
    
    exp_name = experiment_name or config.MLFLOW_EXPERIMENT_NAME
    
    try:
        experiment = mlflow.get_experiment_by_name(exp_name)
        if experiment is None:
            experiment_id = mlflow.create_experiment(exp_name)
            log.info(f"Created experiment: {exp_name} (ID: {experiment_id})")
        else:
            log.info(f"Using experiment: {exp_name} (ID: {experiment.experiment_id})")
        
        return exp_name
    except Exception as e:
        log.error(f"Error managing experiment: {e}")
        return None


def start_run_safe(run_name: str = None, **kwargs):
    """Safely start an MLflow run, handling cases where MLflow is disabled"""
    if not is_mlflow_enabled():
        # Return a dummy context manager that does nothing
        class DummyContext:
            def __enter__(self):
                return self
            def __exit__(self, *args):
                pass
        return DummyContext()
    
    try:
        return mlflow.start_run(run_name=run_name, **kwargs)
    except Exception as e:
        log.error(f"Failed to start MLflow run: {e}")
        # Return dummy context manager on error
        class DummyContext:
            def __enter__(self):
                return self
            def __exit__(self, *args):
                pass
        return DummyContext()


def log_param_safe(key: str, value):
    """Safely log a parameter, handling cases where MLflow is disabled"""
    if not is_mlflow_enabled():
        return
    
    try:
        mlflow.log_param(key, value)
    except Exception as e:
        log.debug(f"Failed to log param {key}: {e}")


def log_metric_safe(key: str, value: float):
    """Safely log a metric, handling cases where MLflow is disabled"""
    if not is_mlflow_enabled():
        return
    
    try:
        mlflow.log_metric(key, value)
    except Exception as e:
        log.debug(f"Failed to log metric {key}: {e}")


def log_text_safe(text: str, artifact_file: str):
    """Safely log text as an artifact, handling cases where MLflow is disabled"""
    if not is_mlflow_enabled():
        return
    
    try:
        mlflow.log_text(text, artifact_file)
    except Exception as e:
        log.debug(f"Failed to log text artifact {artifact_file}: {e}")
