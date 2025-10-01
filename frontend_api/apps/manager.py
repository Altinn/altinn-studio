"""App management functionality"""
import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from shared.models import App

logger = logging.getLogger(__name__)


class AppManager:
    """Manages Altinn app selection and state"""
    
    def __init__(self, studio_apps_dir: str, state_file: Path):
        self.studio_apps_dir = Path(studio_apps_dir)
        self.state_file = state_file
        self.current_app: Optional[Dict[str, Any]] = None
        self._load_state()
    
    def _load_state(self):
        """Load state from persistent storage"""
        try:
            if self.state_file.exists():
                with open(self.state_file, 'r') as f:
                    state = json.load(f)
                    self.current_app = state.get('current_app')
                    logger.info(f"Loaded state: current_app = {self.current_app}")
        except Exception as e:
            logger.warning(f"Failed to load state: {e}")
    
    def _save_state(self):
        """Save state to persistent storage"""
        try:
            state = {'current_app': self.current_app}
            with open(self.state_file, 'w') as f:
                json.dump(state, f, indent=2)
            logger.info(f"Saved state: {state}")
        except Exception as e:
            logger.error(f"Failed to save state: {e}")
    
    def set_current_app(self, app: App):
        """Set the current app"""
        self.current_app = {
            'org': app.org,
            'repo_name': app.name,
            'name': app.name,
            'path': app.path
        }
        self._save_state()
        logger.info(f"Current app set to: {self.current_app}")

    async def _ensure_app_available(self, repo_owner: str, repo_name: str) -> bool:
        """Ensure the requested app is fetched and available locally."""
        try:
            # if not ALTINITY_MODULES_AVAILABLE:
            #     logger.warning("Cannot fetch app: Altinity modules not available")
            #     return False
            
            if not check_api_token():
                logger.warning("Cannot fetch app: No Gitea API token")
                return False
            
            # Check if app already exists locally
            app_dir = Path(self.studio_apps_dir) / f"{repo_owner}-{repo_name}"
            if app_dir.exists():
                logger.info(f"App {repo_owner}/{repo_name} already available locally")
                # Set as current app
                app = App(
                    name=f"{repo_owner}-{repo_name}",
                    org=repo_owner,
                    repo=repo_name,
                    path=str(app_dir),
                    display_name=f"{repo_owner}/{repo_name}"
                )
                self.set_current_app(app)
                return True
            
            # Use the proper fetch function
            logger.info(f"Fetching app {repo_owner}/{repo_name} from Gitea...")
            try:
                from .fetcher import fetch_app_from_gitea
                import asyncio

                # Run the async fetch function
                result = asyncio.run(fetch_app_from_gitea(repo_owner, repo_name, str(self.studio_apps_dir)))
                success = result.get("success", False)

                if not success:
                    logger.error(f"Failed to fetch app: {result.get('error', 'Unknown error')}")
                    return False

            except Exception as e:
                logger.error(f"Failed to fetch app {repo_owner}/{repo_name}: {e}")
                return False
            
            # Verify it was fetched successfully
            if app_dir.exists():
                logger.info(f"Successfully fetched app {repo_owner}/{repo_name}")
                # Set as current app
                app = App(
                    name=f"{repo_owner}-{repo_name}",
                    org=repo_owner,
                    repo=repo_name,
                    path=str(app_dir),
                    display_name=f"{repo_owner}/{repo_name}"
                )
                self.set_current_app(app)
                return True
            else:
                logger.error(f"Failed to fetch app {repo_owner}/{repo_name}")
                return False
                
        except Exception as e:
            logger.error(f"Error ensuring app availability: {e}")
            return False
    
    def get_current_app(self) -> Optional[Dict[str, Any]]:
        """Get the current app"""
        return self.current_app
    
    def reset(self):
        """Reset the current app selection"""
        self.current_app = None
        self._save_state()
        logger.info("App selection reset")
    
    def resolve_app_directory(self, org: str, app: str) -> Optional[Path]:
        """
        Get the app directory path from the current app state.
        
        Args:
            org: Organization name from URL (not used, kept for compatibility)
            app: App name from URL (not used, kept for compatibility)
            
        Returns:
            Path to the current app directory, or None if no app selected
        """
        if not self.current_app:
            logger.warning(f"No app selected when trying to resolve directory for {org}/{app}")
            return None
        print(self.current_app)
        app_path = Path(self.current_app['path'])
        if not app_path.exists():
            logger.warning(f"App directory does not exist: {app_path}")
            return None
        
        return app_path
