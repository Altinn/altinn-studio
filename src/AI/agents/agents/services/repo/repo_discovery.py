"""
Repository discovery service for dynamic context-aware planning.
Scans repository to discover locales, source of truth, available files, etc.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Literal, Tuple

from agents.schemas.plan_schema import PlanContext
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


class RepositoryDiscovery:
    """Discovers repository structure and context for adaptive planning"""
    
    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path)
    
    def discover_context(self) -> PlanContext:
        """Main discovery method - scans repo and builds context"""
        context = PlanContext()
        
        # Discover available locales from resource files
        context.available_locales = self._discover_locales()
        
        # Find available layout pages
        context.layout_pages = self._discover_layout_files()
        
        # Find model files
        context.model_files = self._discover_model_files()
        
        # Find resource files
        context.resource_files = self._discover_resource_files()
        
        log.info(f"Repository discovery complete: {len(context.available_locales)} locales, "
                f"{len(context.layout_pages)} layouts")
        
        return context
    
    def _discover_locales(self) -> List[str]:
        """Discover available locales from resource files"""
        locales = set()
        resource_dir = self.repo_path / "App" / "config" / "texts"
        
        if not resource_dir.exists():
            log.warning(f"Resource directory not found: {resource_dir}")
            return []
        
        # Find all resource.<locale>.json files
        resource_pattern = re.compile(r'resource\.([a-z]{2})\.json$')
        
        for file_path in resource_dir.glob("resource.*.json"):
            match = resource_pattern.match(file_path.name)
            if match:
                locale = match.group(1)
                locales.add(locale)
                log.debug(f"Found locale: {locale}")
        
        return sorted(list(locales))
    
    def _discover_layout_files(self) -> List[str]:
        """Find all available layout files"""
        layouts_dir = self.repo_path / "App" / "ui" / "form" / "layouts"
        layout_files = []
        
        if not layouts_dir.exists():
            log.warning(f"Layouts directory not found: {layouts_dir}")
            return []
        
        for layout_file in layouts_dir.glob("*.json"):
            relative_path = str(layout_file.relative_to(self.repo_path))
            layout_files.append(relative_path)
            log.debug(f"Found layout: {relative_path}")
        
        return sorted(layout_files)
    
    def _discover_model_files(self) -> List[str]:
        """Find all model-related files"""
        models_dir = self.repo_path / "App" / "models"
        model_files = []
        
        if not models_dir.exists():
            return []
        
        # Look for various model file types
        model_patterns = ["*.schema.json", "*.xsd", "*.cs"]
        
        for pattern in model_patterns:
            for model_file in models_dir.glob(pattern):
                relative_path = str(model_file.relative_to(self.repo_path))
                model_files.append(relative_path)
        
        return sorted(model_files)
    
    def _discover_resource_files(self) -> List[str]:
        """Find all resource files"""
        resource_dir = self.repo_path / "App" / "config" / "texts"
        resource_files = []
        
        if not resource_dir.exists():
            return []
        
        for resource_file in resource_dir.glob("*.json"):
            relative_path = str(resource_file.relative_to(self.repo_path))
            resource_files.append(relative_path)
        
        return sorted(resource_files)
    
    def check_arithmetic_usage(self, field_binding: str) -> bool:
        """
        Check if a field binding is used in arithmetic expressions.
        Scans rules and other logic files for arithmetic usage.
        """
        # Look for rules files
        rules_dir = self.repo_path / "App" / "logic"
        
        if not rules_dir.exists():
            return False
        
        arithmetic_operators = ['+', '-', '*', '/', 'sum', 'avg', 'count', 'Math.']
        
        for rules_file in rules_dir.rglob("*.cs"):
            try:
                content = rules_file.read_text(encoding='utf-8')
                
                # Check if field binding appears near arithmetic operators
                if field_binding in content:
                    for operator in arithmetic_operators:
                        # Simple heuristic: if operator appears within 50 chars of binding
                        binding_pos = content.find(field_binding)
                        operator_pos = content.find(operator, max(0, binding_pos - 50))
                        
                        if 0 <= operator_pos <= binding_pos + 50:
                            log.info(f"Field {field_binding} appears to be used arithmetically")
                            return True
            
            except Exception as e:
                log.warning(f"Could not scan {rules_file}: {e}")
        
        return False
    
    def discover_component_anchor_candidates(self, layout_file: str) -> List[Dict]:
        """
        Discover potential anchor points in a layout file.
        Returns list of components that can serve as anchors.
        """
        layout_path = self.repo_path / layout_file
        
        if not layout_path.exists():
            return []
        
        try:
            with open(layout_path, 'r') as f:
                layout_data = json.load(f)
            
            # Extract layout array
            layout_array = self._extract_layout_array(layout_data)
            
            candidates = []
            for i, component in enumerate(layout_array):
                candidate = {
                    'index': i,
                    'id': component.get('id'),
                    'type': component.get('type'),
                    'text_key': component.get('textResourceBindings', {}).get('title')
                }
                
                # Only include components that can serve as anchors
                if candidate['id'] or candidate['text_key']:
                    candidates.append(candidate)
            
            return candidates
            
        except Exception as e:
            log.error(f"Could not analyze layout {layout_file}: {e}")
            return []
    
    def _extract_layout_array(self, layout_data: Dict) -> List[Dict]:
        """Extract layout array from various layout file formats"""
        if 'data' in layout_data and 'layout' in layout_data['data']:
            return layout_data['data']['layout']
        elif isinstance(layout_data, list):
            return layout_data
        else:
            return []


def discover_repository_context(repo_path: str) -> PlanContext:
    """
    Main entry point for repository discovery.
    Returns discovered context for use in planning and validation.
    """
    discovery = RepositoryDiscovery(repo_path)
    return discovery.discover_context()


def check_field_arithmetic_usage(repo_path: str, field_binding: str) -> bool:
    """Check if a field is used in arithmetic operations"""
    discovery = RepositoryDiscovery(repo_path)
    return discovery.check_arithmetic_usage(field_binding)
