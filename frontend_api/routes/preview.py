"""
Preview routes for Altinn apps
All preview functionality in one place
"""
import glob
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, Response

logger = logging.getLogger(__name__)

# Store instances in memory
_instances = {}

def register_preview_routes(app: FastAPI, studio_apps_dir: str, resolve_app_directory_func):
    """Register all preview routes to the FastAPI app"""
    
    # Make these available to all route handlers
    STUDIO_APPS_DIR = studio_apps_dir
    resolve_app_directory = resolve_app_directory_func
    
    @app.get("/preview/{org}/{app}")
    async def preview_frontend(org: str, app: str):
        """Serve the preview frontend interface"""
        # Return HTML that loads the app in an iframe with mocked APIs
        html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>App Preview - {org}/{app}</title>
                <style>
                    body {{ margin: 0; font-family: Arial, sans-serif; }}
                    .preview-header {{ 
                        background: #f5f5f5; 
                        padding: 10px 20px; 
                        border-bottom: 1px solid #ddd;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }}
                    .preview-iframe {{ 
                        width: 100%; 
                        height: calc(100vh - 60px); 
                        border: none; 
                    }}
                    .preview-controls {{ display: flex; gap: 10px; }}
                    .btn {{ 
                        padding: 8px 16px; 
                        background: #0078d4; 
                        color: white; 
                        border: none; 
                        border-radius: 4px; 
                        cursor: pointer;
                        text-decoration: none;
                        display: inline-block;
                    }}
                    .btn:hover {{ background: #106ebe; }}
                </style>
            </head>
            <body>
                <div class="preview-header">
                    <h3 style="margin: 0;">Preview: {org}/{app}</h3>
                    <div class="preview-controls">
                        <a href="/preview/{org}/{app}/app" class="btn" target="_blank">Open in New Tab</a>
                        <button class="btn" onclick="document.getElementById('preview-frame').src = document.getElementById('preview-frame').src">Refresh</button>
                    </div>
                </div>
                
                <iframe 
                    id="preview-frame"
                    src="/preview/{org}/{app}/app" 
                    class="preview-iframe"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                ></iframe>
            </body>
            </html>
    """
        return HTMLResponse(content=html_content)

    @app.get("/preview/{org}/{app}/app")
    async def preview_app_frontend(org: str, app: str):
        """Serve the actual app frontend HTML from the app repository"""
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-{app}"
        index_file = app_dir / "App" / "views" / "Home" / "Index.cshtml"
        
        if index_file.exists():
            try:
                with open(index_file, 'r', encoding='utf-8') as f:
                    html_content = f.read()
                    
                # Replace ViewBag variables with our org/app values
                html_content = html_content.replace("@ViewBag.Org", org)
                html_content = html_content.replace("@ViewBag.App", app)
                
                # Modify the URL parsing script to work with our preview URLs
                # Use regex to replace appId[1] and appId[2] with appId[2] and appId[3]
                # This is more flexible than exact string matching
                html_content = re.sub(
                    r'window\.org\s*=\s*appId\[1\];',
                    'window.org = appId[2];',
                    html_content
                )
                html_content = re.sub(
                    r'window\.app\s*=\s*appId\[2\];',
                    'window.app = appId[3];',
                    html_content
                )
                
                # Update custom component paths to use our preview endpoint
                html_content = html_content.replace(
                    f"/{org}/{app}/altinn-studio-custom-components/",
                    f"/preview/{org}/{app}/altinn-studio-custom-components/"
                )
                
                return HTMLResponse(content=html_content)
                
            except Exception as e:
                logger.error(f"Could not read app frontend HTML: {e}")
        
        # Fallback to basic HTML if Index.cshtml not found
        fallback_content = f"""
        <!DOCTYPE html>
        <html lang="no">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>{org} - {app}</title>
            <link rel="icon" href="https://altinncdn.no/favicon.ico">
            <link rel="stylesheet" type="text/css" href="/altinn-app-frontend.css">
        </head>
        <body>
            <div id="root"></div>
            <script>
                window.org = '{org}';
                window.app = '{app}';
                window.appFrontendDevelopment = true;
            </script>
            <script src="/altinn-app-frontend.js"></script>
        </body>
        </html>
        """
        
        return HTMLResponse(content=fallback_content)

    @app.get("/preview/{org}/{app}/altinn-studio-custom-components/{filename}")
    async def preview_custom_components(org: str, app: str, filename: str):
        """Serve custom components (CSS/JS) from the app"""
        # The app HTML references paths like /dibk/nabovarsel-v5/altinn-studio-custom-components/main.css
        # We need to serve these from the app's directory
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-{app}"
        
        # Try different possible locations for custom components
        possible_paths = [
            app_dir / "App" / "wwwroot" / "altinn-studio-custom-components" / filename,
            app_dir / "App" / "ui" / "altinn-studio-custom-components" / filename,
            app_dir / "altinn-studio-custom-components" / filename,
        ]
        
        from fastapi.responses import Response
        
        for file_path in possible_paths:
            if file_path.exists():
                try:
                    # Determine content type based on file extension
                    if filename.endswith(".css"):
                        content_type = "text/css"
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                    elif filename.endswith(".js"):
                        content_type = "application/javascript"
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                    elif filename.endswith(".woff2"):
                        content_type = "font/woff2"
                        with open(file_path, 'rb') as f:
                            content = f.read()
                        return Response(content=content, media_type=content_type)
                    elif filename.endswith(".woff"):
                        content_type = "font/woff"
                        with open(file_path, 'rb') as f:
                            content = f.read()
                        return Response(content=content, media_type=content_type)
                    else:
                        content_type = "text/plain"
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                    
                    return Response(content=content, media_type=content_type)
                except Exception as e:
                    logger.warning(f"Could not read custom component {filename}: {e}")
        
        # Return empty content if file not found
        content_type = "text/css" if filename.endswith(".css") else "application/javascript"
        return Response(content="/* Custom component not found */", media_type=content_type)

    # ============================================================================
    # MOCK API ENDPOINTS FOR APP PREVIEW
    # These endpoints provide the responses that Altinn apps expect
    # ============================================================================

    @app.get("/preview/{org}/{app}/api/v1/footer")
    async def preview_footer(org: str, app: str):
        """Mock footer content"""
        return {
            "footerContent": {
                "nb": "Altinity Preview Mode",
                "en": "Altinity Preview Mode"
            }
        }

    @app.get("/preview/{org}/{app}/api/v1/version")
    async def preview_version(org: str, app: str):
        """Mock backend version"""
        return {
            "version": "8.0.0"
        }

    @app.get("/{org}/{app}/api/v1/version")
    async def app_version(org: str, app: str):
        """Mock backend version for direct app paths"""
        return {
            "version": "8.0.0"
        }

    @app.get("/{org}/{app}/api/v1/footer")
    async def app_footer(org: str, app: str):
        """Mock footer content for direct app paths"""
        return {
            "footerContent": {
                "nb": "Altinity Preview Mode", 
                "en": "Altinity Preview Mode"
            }
        }

    @app.get("/preview/{org}/{app}/api/v1/profile/user")
    async def preview_user_profile(org: str, app: str):
        """Mock user profile"""
        return {
            "userId": 12345,
            "userName": "preview@altinity.no",
            "phoneNumber": None,
            "email": "preview@altinity.no",
            "partyId": 12345,
            "party": {
                "partyId": 12345,
                "partyTypeName": 1,
                "orgNumber": None,
                "ssn": None,
                "unitType": None,
                "name": "Preview User",
                "isDeleted": False,
                "onlyHierarchyElementWithNoAccess": False
            },
            "userType": 1,
            "profileSettingPreference": {
                "language": "nb",
                "preSelectedPartyId": 12345,
                "doNotPromptForParty": False
            },
            "currentLanguage": "nb"
        }

    @app.get("/{org}/{app}/api/v1/profile/user")
    async def app_user_profile(org: str, app: str):
        """Mock user profile for direct app paths"""
        return {
            "userId": 12345,
            "userName": "preview@altinity.no",
            "phoneNumber": None,
            "email": "preview@altinity.no",
            "partyId": 12345,
            "party": {
                "partyId": 12345,
                "partyTypeName": 1,
                "orgNumber": None,
                "ssn": None,
                "unitType": None,
                "name": "Preview User",
                "isDeleted": False,
                "onlyHierarchyElementWithNoAccess": False
            },
            "userType": 1,
            "profileSettingPreference": {
                "language": "nb",
                "preSelectedPartyId": 12345,
                "doNotPromptForParty": False
            },
            "currentLanguage": "nb"
        }

    @app.get("/preview/{org}/{app}/api/v1/applicationmetadata")
    async def preview_app_metadata(org: str, app: str):
        """Mock application metadata"""
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-{app}"
        
        # Try to read actual applicationmetadata.json from the app
        metadata_file = app_dir / "App" / "config" / "applicationmetadata.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                    # Override some values for preview
                    metadata["partyTypesAllowed"] = {
                        "person": False,  # Set to false like Altinn Studio does
                        "organisation": False,
                        "subUnit": False,
                        "bankruptcyEstate": False
                    }
                    # Add the crucial AltinnNugetVersion field that frontend checks
                    metadata["altinnNugetVersion"] = "8.0.0.0"
                    return metadata
            except Exception as e:
                logger.warning(f"Could not read app metadata: {e}")
        
        # Fallback mock metadata
        return {
            "id": f"{org}/{app}",
            "org": org,
            "title": {"nb": f"{app} (Preview)", "en": f"{app} (Preview)"},
            "dataTypes": [
                {
                    "id": "default",
                    "allowedContentTypes": ["application/xml"],
                    "appLogic": {"autoCreate": True, "classRef": "Altinn.App.Models.Model"},
                    "taskId": "Task_1"
                }
            ],
            "partyTypesAllowed": {
                "person": False,
                "organisation": False,
                "subUnit": False,
                "bankruptcyEstate": False
            },
            "created": "2024-01-01T00:00:00Z",
            "createdBy": "preview",
            "lastChanged": "2024-01-01T00:00:00Z",
            "lastChangedBy": "preview"
        }

    @app.get("/preview/{org}/{app}/api/v1/profile/user")
    async def preview_user_profile(org: str, app: str):
        """Mock user profile"""
        return {
            "userId": 1024,
            "userName": "previewUser",
            "phoneNumber": "12345678",
            "email": "preview@test.com",
            "partyId": 51001,
            "party": {},
            "userType": 0,
            "profileSettingPreference": {"language": "nb"}
        }

    @app.get("/preview/{org}/{app}/api/authorization/parties/current")
    async def preview_current_party(org: str, app: str):
        """Mock current party"""
        return {
            "partyId": 51001,
            "partyTypeName": "Person",
            "orgNumber": "1",
            "ssn": None,
            "unitType": "AS",
            "name": "Test Testesen (Preview)",
            "isDeleted": False,
            "onlyHierarchyElementWithNoAccess": False,
            "person": {},
            "organization": None,
            "childParties": None
        }

    @app.get("/preview/{org}/{app}/api/resource/FormLayout.json")
    async def preview_form_layouts(org: str, app: str):
        """Serve actual form layouts from app"""
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-{app}"
        layouts_dir = app_dir / "App" / "ui" / "layouts"
        
        layouts = {}
        if layouts_dir.exists():
            try:
                for layout_file in layouts_dir.glob("*.json"):
                    with open(layout_file, 'r', encoding='utf-8') as f:
                        layouts[layout_file.stem] = json.load(f)
            except Exception as e:
                logger.warning(f"Could not read layouts: {e}")
        
        # Return empty layouts if none found
        if not layouts:
            layouts = {
                "FormLayout": {
                    "data": {
                        "layout": [
                            {
                                "id": "preview-message",
                                "type": "Header",
                                "textResourceBindings": {
                                    "title": "preview.title"
                                }
                            }
                        ]
                    }
                }
            }
        
        return layouts

    @app.get("/preview/{org}/{app}/api/v1/texts/{language}")
    async def preview_texts(org: str, app: str, language: str):
        """Serve text resources"""
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-{app}"
        texts_file = app_dir / "App" / "config" / "texts" / f"resource.{language}.json"
        
        if texts_file.exists():
            try:
                with open(texts_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not read texts: {e}")
        
        # Fallback texts
        return {
            "language": language,
            "resources": [
                {
                    "id": "preview.title",
                    "value": f"Preview: {app}"
                }
            ]
        }

    @app.get("/preview/{org}/{app}/api/v1/applicationsettings")
    async def preview_app_settings(org: str, app: str):
        """Mock application settings"""
        return {
            "id": f"{org}/{app}",
            "org": org,
            "title": {"nb": f"{app} (Preview)"}
        }

    @app.get("/{org}/{app}/api/v1/applicationmetadata")
    async def app_metadata(org: str, app: str):
        """Mock application metadata for direct app paths"""
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-{app}"
        
        # Try to read actual applicationmetadata.json from the app
        metadata_file = app_dir / "App" / "config" / "applicationmetadata.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                    # Override some values for preview
                    metadata["partyTypesAllowed"] = {
                        "person": False,  # Set to false like Altinn Studio does
                        "organisation": False,
                        "subUnit": False,
                        "bankruptcyEstate": False
                    }
                    # Add the crucial AltinnNugetVersion field that frontend checks
                    metadata["altinnNugetVersion"] = "8.0.0.0"
                    return metadata
            except Exception as e:
                logger.warning(f"Could not read app metadata: {e}")
        
        # Fallback mock metadata
        return {
            "id": f"{org}/{app}",
            "org": org,
            "title": {"nb": f"{app} (Preview)", "en": f"{app} (Preview)"},
            "dataTypes": [
                {
                    "id": "default",
                    "allowedContentTypes": ["application/xml"],
                    "appLogic": {"autoCreate": True, "classRef": "Altinn.App.Models.Model"},
                    "taskId": "Task_1"
                }
            ],
            "partyTypesAllowed": {
                "person": False,
                "organisation": False,
                "subUnit": False,
                "bankruptcyEstate": False
            },
            "autoDeleteOnProcessEnd": False,
            "created": "2023-01-01T00:00:00Z",
            "createdBy": "preview",
            "lastChanged": "2023-01-01T00:00:00Z",
            "lastChangedBy": "preview",
            # Add the crucial AltinnNugetVersion field that frontend checks
            "altinnNugetVersion": "8.0.0.0"
        }

    @app.get("/preview/{org}/{app}/api/authentication/keepAlive")
    async def preview_keep_alive(org: str, app: str):
        """Mock keep alive endpoint"""
        return {"status": "ok"}

    @app.get("/preview/{org}/{app}/api/v1/data/anonymous")
    async def preview_anonymous(org: str, app: str):
        """Mock anonymous data endpoint"""
        return {}

    @app.get("/preview/{org}/{app}/api/v1/parties")
    async def preview_parties(org: str, app: str, allowedToInstantiateFilter: str = None):
        """Mock parties endpoint"""
        return [
            {
                "partyId": 51001,
                "partyTypeName": "Person",
                "name": "Test Testesen (Preview)",
                "ssn": "11223344556",
                "isDeleted": False,
                "onlyHierarchyElementWithNoAccess": False,
                "person": {}
            }
        ]

    @app.post("/preview/{org}/{app}/api/v1/parties/validateInstantiation")
    async def preview_validate_instantiation(org: str, app: str):
        """Mock instantiation validation"""
        return {"valid": True}

    @app.get("/preview/{org}/{app}/api/v1/applicationlanguages")
    async def preview_app_languages(org: str, app: str):
        """Mock application languages"""
        return [
            {"language": "nb"},
            {"language": "en"}
        ]

    def clean_json_comments(json_text: str) -> str:
        """Remove // comments from JSON text to make it parseable"""
        lines = json_text.split('\n')
        cleaned_lines = []
        for line in lines:
            # Remove lines that start with // (with optional whitespace)
            stripped = line.strip()
            if stripped.startswith('//'):
                continue
            # Remove inline // comments (basic approach)
            if '//' in line:
                comment_pos = line.find('//')
                # Make sure it's not inside a string value
                before_comment = line[:comment_pos]
                quote_count = before_comment.count('"') - before_comment.count('\\"')
                if quote_count % 2 == 0:  # Even number of quotes = we're outside a string
                    line = line[:comment_pos].rstrip() + ('\n' if line.endswith('\n') else '')
            cleaned_lines.append(line)
        return '\n'.join(cleaned_lines)

    @app.get("/preview/{org}/api/v1/texts/{language}")
    async def preview_texts(org: str, language: str):
        """Mock text resources"""
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-*"  # Find any app in this org
        
        # Try to find text resources from any app in this org
        import glob
        for app_path in glob.glob(str(app_dir)):
            text_file = Path(app_path) / "App" / "config" / "texts" / f"resource.{language}.json"
            if text_file.exists():
                try:
                    with open(text_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Clean JSON comments before parsing
                        cleaned_content = clean_json_comments(content)
                        return json.loads(cleaned_content)
                except Exception as e:
                    logger.warning(f"Could not read text resources: {e}")
        
        # Fallback mock texts
        return {
            "language": language,
            "resources": [
                {"id": "common.submit", "value": "Send inn"},
                {"id": "common.cancel", "value": "Avbryt"},
                {"id": "common.next", "value": "Neste"},
                {"id": "common.back", "value": "Tilbake"}
            ]
        }

    @app.get("/{org}/{app}/api/layoutsets")
    async def app_layoutsets(org: str, app: str):
        """Mock layoutsets"""
        app_dir = resolve_app_directory(org, app)
        if not app_dir:
            logger.warning(f"App directory not found for {org}/{app}")
            # Return fallback layoutsets
            return {
                "sets": [
                    {
                        "id": "form",
                        "dataType": "model",
                        "tasks": ["Task_1"]
                    }
                ]
            }
        
        layoutsets_file = app_dir / "App" / "ui" / "layoutsets.json"
        
        if layoutsets_file.exists():
            try:
                with open(layoutsets_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not read layoutsets: {e}")
        
        # Fallback mock layoutsets
        return {
            "sets": [
                {
                    "id": "form",
                    "dataType": "model",
                    "tasks": ["Task_1"]
                }
            ]
        }

    @app.get("/{org}/{app}/api/v1/applicationsettings")
    async def app_settings(org: str, app: str):
        """Mock application settings"""
        return {
            "pages": {
                "order": ["page1"],
                "excludeFromPdf": []
            }
        }

    @app.get("/{org}/{app}/api/v1/applicationlanguages")
    async def app_languages(org: str, app: str):
        """Mock application languages for direct app paths"""
        return [
            {"language": "nb"},
            {"language": "en"}
        ]

    @app.get("/{org}/{app}/api/v1/parties")
    async def app_parties(org: str, app: str, allowedToInstantiateFilter: str = None):
        """Mock parties endpoint for direct app paths"""
        return [
            {
                "partyId": 51001,
                "partyTypeName": "Person",
                "name": "Test Testesen (Preview)",
                "ssn": "11223344556",
                "isDeleted": False,
                "onlyHierarchyElementWithNoAccess": False,
                "person": {}
            }
        ]

    @app.post("/{org}/{app}/api/v1/parties/validateInstantiation")
    async def app_validate_instantiation(org: str, app: str):
        """Mock instantiation validation for direct app paths"""
        return {"valid": True}

    @app.get("/{org}/{app}/api/v1/data/anonymous")
    async def app_anonymous_data(org: str, app: str):
        """Mock anonymous data endpoint for direct app paths"""
        return {}

    @app.get("/{org}/{app}/api/layouts/{layoutSetId}")
    async def app_layouts_with_set(org: str, app: str, layoutSetId: str):
        """Get layouts for a specific layout set"""
        return await app_layouts(org, app, layoutSetId)

    @app.get("/{org}/{app}/api/layouts")
    async def app_layouts(org: str, app: str, layoutSetName: str = None):
        """Mock layouts endpoint for direct app paths"""
        app_dir = resolve_app_directory(org, app)
        if not app_dir:
            return {"data": {"layout": []}}
        
        
        # Try to read actual layouts from the app
        layouts_dir = app_dir / "App" / "ui" / "form" / "layouts"
        layouts = {}
        
        if layouts_dir.exists():
            for layout_file in layouts_dir.glob("*.json"):
                try:
                    with open(layout_file, 'r', encoding='utf-8') as f:
                        layouts[layout_file.stem] = json.load(f)
                except Exception as e:
                    logger.warning(f"Could not read layout {layout_file.stem}: {e}")
        
        # Fallback to basic layout if no layouts found
        if not layouts:
            layouts = {
                "default": {
                    "data": {
                        "layout": [
                            {
                                "id": "welcome-text",
                                "type": "Paragraph",
                                "textResourceBindings": {
                                    "title": "preview.title"
                                }
                            }
                        ]
                    }
                }
            }
        
        return layouts

    @app.get("/{org}/{app}/api/authentication/keepAlive")
    async def app_keep_alive(org: str, app: str):
        """Mock keep alive endpoint for direct app paths"""
        return {"status": "ok"}

    @app.get("/{org}/{app}/api/v1/texts/{language}")
    async def app_texts(org: str, app: str, language: str):
        """Serve text resources for direct app paths"""
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-{app}"
        text_file = app_dir / "App" / "config" / "texts" / f"resource.{language}.json"
        
        if text_file.exists():
            try:
                with open(text_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Clean JSON comments before parsing
                    cleaned_content = clean_json_comments(content)
                    return json.loads(cleaned_content)
            except Exception as e:
                logger.warning(f"Could not read text resources from {text_file}: {e}")
        
        # Fallback mock texts
        return {
            "language": language,
            "resources": [
                {"id": "appName", "value": f"{app}"},
                {"id": "common.submit", "value": "Send inn"},
                {"id": "common.cancel", "value": "Avbryt"},
                {"id": "common.next", "value": "Neste"},
                {"id": "common.back", "value": "Tilbake"}
            ]
        }

    @app.get("/{org}/{app}/api/v1/profile/user/language")
    async def app_user_language(org: str, app: str):
        """Return current user language"""
        return {"language": "nb"}

    @app.get("/preview/{org}/{app}/api/v1/profile/user/language")
    async def preview_user_language(org: str, app: str):
        """Return current user language for preview"""
        return {"language": "nb"}

    @app.get("/{org}/{app}/api/authorization/parties/current")
    async def app_current_party(org: str, app: str):
        """Mock current party for direct app paths"""
        return {
            "partyId": 51001,
            "partyTypeName": "Person",
            "orgNumber": "1", 
            "ssn": None,
            "unitType": "AS",
            "name": "Test Testesen",
            "isDeleted": False,
            "onlyHierarchyElementWithNoAccess": False,
            "person": {},
            "organization": None,
            "childParties": None
        }

    @app.get("/preview/{org}/{app}/api/authorization/parties/current")
    async def preview_current_party(org: str, app: str):
        """Mock current party for preview"""
        return {
            "partyId": 51001,
            "partyTypeName": "Person",
            "orgNumber": "1",
            "ssn": None,
            "unitType": "AS", 
            "name": "Test Testesen",
            "isDeleted": False,
            "onlyHierarchyElementWithNoAccess": False,
            "person": {},
            "organization": None,
            "childParties": None
        }

    @app.get("/{org}/{app}/api/v1/textresources")
    async def app_text_resources(org: str, app: str):
        """Serve all text resources for direct app paths"""
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-{app}"
        text_file = app_dir / "App" / "config" / "texts" / "resource.nb.json"
        
        if text_file.exists():
            try:
                with open(text_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Clean JSON comments before parsing
                    cleaned_content = clean_json_comments(content)
                    return json.loads(cleaned_content)
            except Exception as e:
                logger.warning(f"Could not read text resources from {text_file}: {e}")
        
        # Fallback mock texts
        return {
            "language": "nb",
            "resources": [
                {"id": "appName", "value": f"{app}"},
                {"id": "common.submit", "value": "Send inn"},
                {"id": "common.cancel", "value": "Avbryt"},
                {"id": "common.next", "value": "Neste"},
                {"id": "common.back", "value": "Tilbake"}
            ]
        }

    @app.get("/preview/{org}/{app}/api/v1/textresources")
    async def preview_text_resources(org: str, app: str):
        """Serve all text resources for preview"""
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-{app}"
        text_file = app_dir / "App" / "config" / "texts" / "resource.nb.json"
        
        if text_file.exists():
            try:
                with open(text_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Clean JSON comments before parsing
                    cleaned_content = clean_json_comments(content)
                    return json.loads(cleaned_content)
            except Exception as e:
                logger.warning(f"Could not read text resources from {text_file}: {e}")
        
        # Fallback mock texts
        return {
            "language": "nb",
            "resources": [
                {"id": "appName", "value": f"{app}"},
                {"id": "common.submit", "value": "Send inn"},
                {"id": "common.cancel", "value": "Avbryt"},
                {"id": "common.next", "value": "Neste"},
                {"id": "common.back", "value": "Tilbake"}
            ]
        }

    @app.get("/{org}/{app}/api/resource/FormLayout.json")
    async def app_form_layouts_resource(org: str, app: str):
        """Serve form layouts as byte array - matches PreviewController exactly"""
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-{app}"
        
        # Try to read actual layouts from the app
        layouts_dir = app_dir / "App" / "ui" / "form" / "layouts"
        layouts = {}
        
        if layouts_dir.exists():
            for layout_file in layouts_dir.glob("*.json"):
                try:
                    with open(layout_file, 'r', encoding='utf-8') as f:
                        layouts[layout_file.stem] = json.load(f)
                except Exception as e:
                    logger.warning(f"Could not read layout {layout_file.stem}: {e}")
        
        # Return as JSON response like the PreviewController does
        from fastapi.responses import Response
        content = json.dumps(layouts, indent=2)
        return Response(content=content, media_type="application/json")

    @app.get("/preview/{org}/{app}/api/resource/FormLayout.json")  
    async def preview_form_layouts_resource(org: str, app: str):
        """Serve form layouts for preview"""
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-{app}"
        
        # Try to read actual layouts from the app
        layouts_dir = app_dir / "App" / "ui" / "form" / "layouts"
        layouts = {}
        
        if layouts_dir.exists():
            for layout_file in layouts_dir.glob("*.json"):
                try:
                    with open(layout_file, 'r', encoding='utf-8') as f:
                        layouts[layout_file.stem] = json.load(f)
                except Exception as e:
                    logger.warning(f"Could not read layout {layout_file.stem}: {e}")
        
        # Return as JSON response like the PreviewController does
        from fastapi.responses import Response
        content = json.dumps(layouts, indent=2)
        return Response(content=content, media_type="application/json")

    @app.post("/{org}/{app}/instances")
    async def create_app_instance(org: str, app: str, instanceOwnerPartyId: int, language: str = "nb"):
        """Create a new app instance - critical for app initialization"""
        import uuid
        from datetime import datetime, timezone
        
        instance_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        instance = {
            "id": f"{instanceOwnerPartyId}/{instance_id}",
            "instanceOwner": {
                "partyId": str(instanceOwnerPartyId),
                "personNumber": None,
                "organisationNumber": None
            },
            "appId": f"{org}/{app}",
            "org": org,
            "selfLinks": {
                "apps": f"/{org}/{app}",
                "platform": f"/instances/{instanceOwnerPartyId}/{instance_id}"
            },
            "dueBefore": None,
            "visibleAfter": None,
            "process": {
                "started": now,
                "startEvent": "StartEvent_1",
                "currentTask": {
                    "flow": 2,
                    "started": now,
                    "elementId": "Task_1",
                    "name": "Task_1",
                    "altinnTaskType": "data",
                    "validated": {
                        "timestamp": now,
                        "canCompleteTask": True
                    }
                },
                "ended": None,
                "endEvent": None
            },
            "status": {
                "isArchived": False,
                "archived": None,
                "isSoftDeleted": False,
                "softDeleted": None,
                "isHardDeleted": False,
                "hardDeleted": None
            },
            "completeConfirmations": None,
            "data": [
                {
                    "id": str(uuid.uuid4()),
                    "instanceGuid": instance_id,
                    "dataType": "model",
                    "filename": None,
                    "contentType": "application/xml",
                    "blobStoragePath": f"/{org}/{app}/{instanceOwnerPartyId}/{instance_id}/data/{uuid.uuid4()}",
                    "selfLinks": {
                        "apps": f"/{org}/{app}/instances/{instanceOwnerPartyId}/{instance_id}/data/{uuid.uuid4()}",
                        "platform": f"/instances/{instanceOwnerPartyId}/{instance_id}/data/{uuid.uuid4()}"
                    },
                    "size": 0,
                    "locked": False,
                    "refs": [],
                    "created": now,
                    "createdBy": "preview-user",
                    "lastChanged": now,
                    "lastChangedBy": "preview-user"
                }
            ],
            "created": now,
            "createdBy": "preview-user",
            "lastChanged": now,
            "lastChangedBy": "preview-user"
        }
        
        # Cache the created instance
        instance_key = f"{org}/{app}/{instanceOwnerPartyId}/{instance_id}"
        _instances[instance_key] = instance
        
        return instance

    @app.post("/preview/{org}/{app}/instances") 
    async def create_preview_instance(org: str, app: str, instanceOwnerPartyId: int, language: str = "nb"):
        """Create a new preview instance"""
        import uuid
        from datetime import datetime, timezone
        
        instance_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        instance = {
            "id": f"{instanceOwnerPartyId}/{instance_id}",
            "instanceOwner": {
                "partyId": str(instanceOwnerPartyId),
                "personNumber": None,
                "organisationNumber": None
            },
            "appId": f"{org}/{app}",
            "org": org,
            "selfLinks": {
                "apps": f"/preview/{org}/{app}",
                "platform": f"/preview/instances/{instanceOwnerPartyId}/{instance_id}"
            },
            "dueBefore": None,
            "visibleAfter": None,
            "process": {
                "started": now,
                "startEvent": "StartEvent_1", 
                "currentTask": {
                    "flow": 2,
                    "started": now,
                    "elementId": "Task_1",
                    "name": "Task_1",
                    "altinnTaskType": "data",
                    "validated": {
                        "timestamp": now,
                        "canCompleteTask": True
                    }
                },
                "ended": None,
                "endEvent": None
            },
            "status": {
                "isArchived": False,
                "archived": None,
                "isSoftDeleted": False,
                "softDeleted": None,
                "isHardDeleted": False,
                "hardDeleted": None
            },
            "completeConfirmations": None,
            "data": [
                {
                    "id": str(uuid.uuid4()),
                    "instanceGuid": instance_id,
                    "dataType": "model",
                    "filename": None,
                    "contentType": "application/xml", 
                    "blobStoragePath": f"/preview/{org}/{app}/{instanceOwnerPartyId}/{instance_id}/data/{uuid.uuid4()}",
                    "selfLinks": {
                        "apps": f"/preview/{org}/{app}/instances/{instanceOwnerPartyId}/{instance_id}/data/{uuid.uuid4()}",
                        "platform": f"/preview/instances/{instanceOwnerPartyId}/{instance_id}/data/{uuid.uuid4()}"
                    },
                    "size": 0,
                    "locked": False,
                    "refs": [],
                    "created": now,
                    "createdBy": "preview-user",
                    "lastChanged": now,
                    "lastChangedBy": "preview-user"
                }
            ],
            "created": now,
            "createdBy": "preview-user", 
            "lastChanged": now,
            "lastChangedBy": "preview-user"
        }
        
        # Cache the created instance
        instance_key = f"preview/{org}/{app}/{instanceOwnerPartyId}/{instance_id}"
        _instances[instance_key] = instance
        
        return instance

    # Store instances in memory for this session (in production, this would be in a database)
    _instances = {}

    @app.get("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}")
    async def get_app_instance(org: str, app: str, instanceOwnerPartyId: int, instanceGuid: str):
        """Get a specific app instance"""
        instance_key = f"{org}/{app}/{instanceOwnerPartyId}/{instanceGuid}"
        
        if instance_key in _instances:
            return _instances[instance_key]
        
        # If not found in cache, create a mock instance (for preview purposes)
        import uuid
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc).isoformat()
        
        instance = {
            "id": f"{instanceOwnerPartyId}/{instanceGuid}",
            "instanceOwner": {
                "partyId": str(instanceOwnerPartyId),
                "personNumber": None,
                "organisationNumber": None
            },
            "appId": f"{org}/{app}",
            "org": org,
            "selfLinks": {
                "apps": f"/{org}/{app}",
                "platform": f"/instances/{instanceOwnerPartyId}/{instanceGuid}"
            },
            "dueBefore": None,
            "visibleAfter": None,
            "process": {
                "started": now,
                "startEvent": "StartEvent_1",
                "currentTask": {
                    "flow": 2,
                    "started": now,
                    "elementId": "Task_1",
                    "name": "Task_1",
                    "altinnTaskType": "data",
                    "validated": {
                        "timestamp": now,
                        "canCompleteTask": True
                    }
                },
                "ended": None,
                "endEvent": None
            },
            "status": {
                "isArchived": False,
                "archived": None,
                "isSoftDeleted": False,
                "softDeleted": None,
                "isHardDeleted": False,
                "hardDeleted": None
            },
            "completeConfirmations": None,
            "data": [
                {
                    "id": str(uuid.uuid4()),
                    "instanceGuid": instanceGuid,
                    "dataType": "model",
                    "filename": None,
                    "contentType": "application/xml",
                    "blobStoragePath": f"/{org}/{app}/{instanceOwnerPartyId}/{instanceGuid}/data/{uuid.uuid4()}",
                    "selfLinks": {
                        "apps": f"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{uuid.uuid4()}",
                        "platform": f"/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{uuid.uuid4()}"
                    },
                    "size": 0,
                    "locked": False,
                    "refs": [],
                    "created": now,
                    "createdBy": "preview-user",
                    "lastChanged": now,
                    "lastChangedBy": "preview-user"
                }
            ],
            "created": now,
            "createdBy": "preview-user",
            "lastChanged": now,
            "lastChangedBy": "preview-user"
        }
        
        # Cache it for future requests
        _instances[instance_key] = instance
        return instance

    @app.get("/preview/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}")
    async def get_preview_instance(org: str, app: str, instanceOwnerPartyId: int, instanceGuid: str):
        """Get a specific preview instance"""
        instance_key = f"preview/{org}/{app}/{instanceOwnerPartyId}/{instanceGuid}"
        
        if instance_key in _instances:
            return _instances[instance_key]
        
        # If not found in cache, create a mock instance (for preview purposes)
        import uuid
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc).isoformat()
        
        instance = {
            "id": f"{instanceOwnerPartyId}/{instanceGuid}",
            "instanceOwner": {
                "partyId": str(instanceOwnerPartyId),
                "personNumber": None,
                "organisationNumber": None
            },
            "appId": f"{org}/{app}",
            "org": org,
            "selfLinks": {
                "apps": f"/preview/{org}/{app}",
                "platform": f"/preview/instances/{instanceOwnerPartyId}/{instanceGuid}"
            },
            "dueBefore": None,
            "visibleAfter": None,
            "process": {
                "started": now,
                "startEvent": "StartEvent_1",
                "currentTask": {
                    "flow": 2,
                    "started": now,
                    "elementId": "Task_1",
                    "name": "Task_1",
                    "altinnTaskType": "data",
                    "validated": {
                        "timestamp": now,
                        "canCompleteTask": True
                    }
                },
                "ended": None,
                "endEvent": None
            },
            "status": {
                "isArchived": False,
                "archived": None,
                "isSoftDeleted": False,
                "softDeleted": None,
                "isHardDeleted": False,
                "hardDeleted": None
            },
            "completeConfirmations": None,
            "data": [
                {
                    "id": str(uuid.uuid4()),
                    "instanceGuid": instanceGuid,
                    "dataType": "model",
                    "filename": None,
                    "contentType": "application/xml",
                    "blobStoragePath": f"/preview/{org}/{app}/{instanceOwnerPartyId}/{instanceGuid}/data/{uuid.uuid4()}",
                    "selfLinks": {
                        "apps": f"/preview/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{uuid.uuid4()}",
                        "platform": f"/preview/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{uuid.uuid4()}"
                    },
                    "size": 0,
                    "locked": False,
                    "refs": [],
                    "created": now,
                    "createdBy": "preview-user",
                    "lastChanged": now,
                    "lastChangedBy": "preview-user"
                }
            ],
            "created": now,
            "createdBy": "preview-user",
            "lastChanged": now,
            "lastChangedBy": "preview-user"
        }
        
        # Cache it for future requests
        _instances[instance_key] = instance
        return instance

    @app.get("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process")
    async def get_app_instance_process(org: str, app: str, instanceOwnerPartyId: int, instanceGuid: str):
        """Get the process state for a specific instance"""
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Get task information from applicationmetadata.json
        app_dir = resolve_app_directory(org, app)
        process_tasks = []
        
        if app_dir:
            metadata_file = app_dir / "App" / "config" / "applicationmetadata.json"
            if metadata_file.exists():
                try:
                    with open(metadata_file, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                        # Extract task IDs from dataTypes
                        for data_type in metadata.get("dataTypes", []):
                            task_id = data_type.get("taskId")
                            if task_id:
                                process_tasks.append({
                                    "elementId": task_id,
                                    "name": task_id,
                                    "altinnTaskType": "data"
                                })
                except Exception as e:
                    logger.warning(f"Could not read application metadata: {e}")
        
        # Fallback to default task if no tasks found
        if not process_tasks:
            process_tasks = [{
                "elementId": "Task_1",
                "name": "Task_1", 
                "altinnTaskType": "data"
            }]
        
        process = {
            "started": now,
            "startEvent": "StartEvent_1",
            "currentTask": {
                "flow": 2,
                "started": now,
                "elementId": "Task_1",
                "name": "Task_1",
                "altinnTaskType": "data",
                "validated": {
                    "timestamp": now,
                    "canCompleteTask": True
                }
            },
            "processTasks": process_tasks,
            "ended": None,
            "endEvent": None
        }
        
        return process

    @app.get("/preview/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process")
    async def get_preview_instance_process(org: str, app: str, instanceOwnerPartyId: int, instanceGuid: str):
        """Get the process state for a specific preview instance"""
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Get task information from applicationmetadata.json
        app_dir = resolve_app_directory(org, app)
        process_tasks = []
        
        if app_dir:
            metadata_file = app_dir / "App" / "config" / "applicationmetadata.json"
            if metadata_file.exists():
                try:
                    with open(metadata_file, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                        # Extract task IDs from dataTypes
                        for data_type in metadata.get("dataTypes", []):
                            task_id = data_type.get("taskId")
                            if task_id:
                                process_tasks.append({
                                    "elementId": task_id,
                                    "name": task_id,
                                    "altinnTaskType": "data"
                                })
                except Exception as e:
                    logger.warning(f"Could not read application metadata: {e}")
        
        # Fallback to default task if no tasks found
        if not process_tasks:
            process_tasks = [{
                "elementId": "Task_1",
                "name": "Task_1", 
                "altinnTaskType": "data"
            }]
        
        process = {
            "started": now,
            "startEvent": "StartEvent_1", 
            "currentTask": {
                "flow": 2,
                "started": now,
                "elementId": "Task_1",
                "name": "Task_1",
                "altinnTaskType": "data",
                "validated": {
                    "timestamp": now,
                    "canCompleteTask": True
                }
            },
            "processTasks": process_tasks,
            "ended": None,
            "endEvent": None
        }
        
        return process

    @app.get("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}")
    async def get_app_instance_data(org: str, app: str, instanceOwnerPartyId: int, instanceGuid: str, dataGuid: str, includeRowId: bool = False, language: str = "nb"):
        """Get form data for a specific instance and data GUID"""
        app_dir = resolve_app_directory(org, app)
        if not app_dir:
            raise HTTPException(status_code=404, detail="App not found")
        
        # Return data structure that matches the form schema
        return {
            "OrgNr": "123456789",
            "Navn": "Test Organization",
            "Maalform": "",
            "Paaloggingsnivaa": "",
            "RapporteringsAar": "",
            "RapporteringsType": "",
            "RapporteringsId": "",
            "Innsender": {
                "Organisasjon": {
                    "Organisasjonsnummer": "123456789",
                    "Navn": "Test Organization"
                }
            },
            "innholdOppdragsansvarligListe": [],
            "tilOpphoerOppdragsansvarlig": []
        }

    @app.get("/preview/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}")
    async def get_preview_instance_data(org: str, app: str, instanceOwnerPartyId: int, instanceGuid: str, dataGuid: str, includeRowId: bool = False, language: str = "nb"):
        """Get form data for a specific preview instance and data GUID"""
        app_dir = resolve_app_directory(org, app)
        if not app_dir:
            raise HTTPException(status_code=404, detail="App not found")
        
        # Return data structure that matches the form schema
        return {
            "OrgNr": "123456789",
            "Navn": "Test Organization",
            "Maalform": "",
            "Paaloggingsnivaa": "",
            "RapporteringsAar": "",
            "RapporteringsType": "",
            "RapporteringsId": "",
            "Innsender": {
                "Organisasjon": {
                    "Organisasjonsnummer": "123456789",
                    "Navn": "Test Organization"
                }
            },
            "innholdOppdragsansvarligListe": [],
            "tilOpphoerOppdragsansvarlig": []
        }

    @app.get("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/validate")
    async def validate_app_instance_data(org: str, app: str, instanceOwnerPartyId: int, instanceGuid: str, dataGuid: str, language: str = "nb"):
        """Validate form data for a specific instance and data GUID"""
        # Return empty validation result (no errors)
        return []

    @app.get("/preview/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/validate")
    async def validate_preview_instance_data(org: str, app: str, instanceOwnerPartyId: int, instanceGuid: str, dataGuid: str, language: str = "nb"):
        """Validate form data for a specific preview instance and data GUID"""
        # Return empty validation result (no errors)
        return []

    @app.get("/{org}/{app}/api/jsonschema/{dataType}")
    async def get_app_jsonschema(org: str, app: str, dataType: str):
        """Get JSON schema for a data type"""
        app_dir = resolve_app_directory(org, app)
        if not app_dir:
            return {}
        
        # Try to find schema file (model.schema.json for model dataType)
        schema_file = app_dir / "App" / "models" / f"{dataType}.schema.json"
        if not schema_file.exists():
            schema_file = app_dir / "App" / "models" / "model.schema.json"
        
        if schema_file.exists():
            try:
                with open(schema_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not read schema file: {e}")
        
        # Return minimal schema
        return {
            "type": "object",
            "properties": {}
        }

    @app.get("/{org}/{app}/api/validationconfig/{dataType}")
    async def get_app_validationconfig(org: str, app: str, dataType: str):
        """Get validation config for a data type"""
        return {}

    @app.get("/{org}/{app}/api/options/{optionId}")
    async def get_app_options(org: str, app: str, optionId: str, language: str = "nb"):
        """Get options data for dropdowns and select lists"""
        app_dir = resolve_app_directory(org, app)
        if not app_dir:
            return []
        
        options_file = app_dir / "App" / "options" / f"{optionId}.json"
        if options_file.exists():
            try:
                with open(options_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not read options file {optionId}: {e}")
        
        # Return empty options list
        return []

    @app.get("/preview/{org}/{app}/api/options/{optionId}")
    async def get_preview_app_options(org: str, app: str, optionId: str, language: str = "nb"):
        """Get preview options data for dropdowns and select lists"""
        return await get_app_options(org, app, optionId, language)

    @app.get("/{org}/{app}/api/datalists/{dataListId}")
    async def get_app_datalists(org: str, app: str, dataListId: str, language: str = "nb", size: int = 50, page: int = 1):
        """Get datalist data for components"""
        # Return empty datalist
        return {
            "data": [],
            "pagination": {
                "totalItems": 0,
                "totalPages": 1,
                "currentPage": page,
                "itemsPerPage": size
            }
        }

    @app.get("/preview/{org}/{app}/api/datalists/{dataListId}")
    async def get_preview_app_datalists(org: str, app: str, dataListId: str, language: str = "nb", size: int = 50, page: int = 1):
        """Get preview datalist data for components"""
        return await get_app_datalists(org, app, dataListId, language, size, page)

    @app.get("/{org}/{app}/api/ruleconfiguration/{layoutSetId}")
    async def get_app_ruleconfiguration(org: str, app: str, layoutSetId: str):
        """Get rule configuration for a layout set"""
        return {}

    @app.get("/{org}/{app}/api/rulehandler/{layoutSetId}")
    async def get_app_rulehandler(org: str, app: str, layoutSetId: str):
        """Get rule handler for a layout set"""
        app_dir = resolve_app_directory(org, app)
        if not app_dir:
            return Response(content="", media_type="application/javascript")
        
        # Look for RuleHandler.js file
        rule_handler_file = app_dir / "App" / "ui" / "form" / "RuleHandler.js"
        if rule_handler_file.exists():
            try:
                with open(rule_handler_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    return Response(content=content, media_type="application/javascript")
            except Exception as e:
                logger.warning(f"Could not read RuleHandler.js: {e}")
        
        # Return empty JavaScript if not found
        return Response(content="", media_type="application/javascript")

    @app.get("/{org}/{app}/api/layoutsettings/{layoutSetId}")
    async def get_app_layout_settings_with_set(org: str, app: str, layoutSetId: str):
        """Get layout settings for the app with layout set ID"""
        return await get_app_layout_settings(org, app)

    @app.get("/{org}/{app}/api/layoutsettings")
    async def get_app_layout_settings(org: str, app: str):
        """Get layout settings for the app"""
        app_dir = resolve_app_directory(org, app)
        if not app_dir:
            return {"pages": {"order": ["1"], "showLanguageSelector": True}}
        
        settings_file = app_dir / "App" / "ui" / "form" / "Settings.json"
        
        if settings_file.exists():
            try:
                with open(settings_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not read layout settings: {e}")
        
        # Fallback layout settings
        return {
            "pages": {
                "order": ["Nabovarsel"]
            }
        }

    @app.get("/preview/{org}/{app}/api/layoutsettings")
    async def get_preview_layout_settings(org: str, app: str):
        """Get layout settings for preview"""
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-{app}"
        settings_file = app_dir / "App" / "ui" / "form" / "Settings.json"
        
        if settings_file.exists():
            try:
                with open(settings_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not read layout settings: {e}")
        
        # Fallback layout settings
        return {
            "pages": {
                "order": ["Nabovarsel"]
            }
        }

    @app.get("/{org}/{app}/api/layouts/{layoutName}")
    async def get_app_specific_layout(org: str, app: str, layoutName: str):
        """Get a specific layout by name"""
        app_dir = resolve_app_directory(org, app)
        if not app_dir:
            return {"data": {"layout": []}}
            
        layout_file = app_dir / "App" / "ui" / "form" / "layouts" / f"{layoutName}.json"
        
        if layout_file.exists():
            try:
                with open(layout_file, 'r', encoding='utf-8') as f:
                    layout_data = json.load(f)
                    # Return the layout data directly, not wrapped
                    return layout_data
            except Exception as e:
                logger.warning(f"Could not read layout {layoutName}: {e}")
        
        # Return empty layout if not found
        return {"data": {"layout": []}}

    @app.get("/preview/{org}/{app}/api/layouts/{layoutName}")
    async def get_preview_specific_layout(org: str, app: str, layoutName: str):
        """Get a specific preview layout by name"""
        app_dir = resolve_app_directory(org, app)
        if not app_dir:
            return {"data": {"layout": []}}
            
        layout_file = app_dir / "App" / "ui" / "form" / "layouts" / f"{layoutName}.json"
        
        if layout_file.exists():
            try:
                with open(layout_file, 'r', encoding='utf-8') as f:
                    layout_data = json.load(f)
                    # Return the layout data directly, not wrapped
                    return layout_data
            except Exception as e:
                logger.warning(f"Could not read layout {layoutName}: {e}")
        
        # Return empty layout if not found
        return {"data": {"layout": []}}

    @app.get("/app-specific-preview/{org}/{app}")
    async def app_specific_preview(org: str, app: str):
        """Serve the app frontend HTML with modified URL parsing for preview routing"""
        app_dir = Path(STUDIO_APPS_DIR) / f"{org}-{app}"
        index_file = app_dir / "App" / "views" / "Home" / "Index.cshtml"
        
        if index_file.exists():
            try:
                with open(index_file, 'r', encoding='utf-8') as f:
                    html_content = f.read()
                    
                # Replace ViewBag variables with our org/app values
                html_content = html_content.replace("@ViewBag.Org", org)
                html_content = html_content.replace("@ViewBag.App", app)
                
                # Use regex for flexible replacement
                html_content = re.sub(
                    r'window\.org\s*=\s*appId\[1\];',
                    'window.org = appId[2];',
                    html_content
                )
                html_content = re.sub(
                    r'window\.app\s*=\s*appId\[2\];',
                    'window.app = appId[3];',
                    html_content
                )
                
                # Update custom component paths to use our preview endpoint
                html_content = html_content.replace(
                    f"/{org}/{app}/altinn-studio-custom-components/",
                    f"/{org}/{app}/altinn-studio-custom-components/"
                )
                
                return HTMLResponse(content=html_content)
                
            except Exception as e:
                logger.error(f"Could not read app frontend HTML: {e}")
        
        # Fallback to basic HTML if Index.cshtml not found
        fallback_content = f"""
        <!DOCTYPE html>
        <html lang="no">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>{org} - {app}</title>
            <link rel="icon" href="https://altinncdn.no/favicon.ico">
            <link rel="stylesheet" type="text/css" href="/altinn-app-frontend.css">
        </head>
        <body>
            <div id="root"></div>
            <script>
                window.org = '{org}';
                window.app = '{app}';
                window.appFrontendDevelopment = true;
            </script>
            <script src="/altinn-app-frontend.js"></script>
        </body>
        </html>
        """
        
        return HTMLResponse(content=fallback_content)

    @app.get("/{org}/{app}/app-development/app-version")
    async def app_version_development(org: str, app: str):
        """Mock app version for development - this is the endpoint causing the version error"""
        return {
            "frontendVersion": "4.21.0-preview.1",
            "backendVersion": "8.0.0.0"
        }

    @app.get("/preview/{org}/{app}/app-development/app-version")
    async def preview_app_version_development(org: str, app: str):
        """Mock app version for development in preview mode"""
        return {
            "frontendVersion": "4.21.0-preview.1", 
            "backendVersion": "8.0.0.0"
        }

    # Catch-all for missing API endpoints to prevent infinite loops
    @app.get("/preview/{org}/{app}/api/{path:path}")
    async def preview_api_catchall(org: str, app: str, path: str):
        """Catch-all for missing API endpoints"""
        logger.warning(f"Missing API endpoint: /preview/{org}/{app}/api/{path}")
        return {"error": "API endpoint not implemented in preview mode", "path": path}

    @app.get("/{org}/{app}/api/{path:path}")  
    async def app_api_catchall(org: str, app: str, path: str):
        """Catch-all for missing API endpoints on direct app paths"""
        logger.warning(f"Missing API endpoint: /{org}/{app}/api/{path}")
        return {"error": "API endpoint not implemented in preview mode", "path": path}

    # Catch-all for POST requests
    @app.post("/preview/{org}/{app}/api/{path:path}")
    async def preview_api_post_catchall(org: str, app: str, path: str):
        """Catch-all for missing POST API endpoints"""
        logger.warning(f"Missing POST API endpoint: /preview/{org}/{app}/api/{path}")
        return {"error": "API endpoint not implemented in preview mode", "path": path}

    @app.post("/{org}/{app}/api/{path:path}")  
    async def app_api_post_catchall(org: str, app: str, path: str):
        """Catch-all for missing POST API endpoints on direct app paths"""
        logger.warning(f"Missing POST API endpoint: /{org}/{app}/api/{path}")
        return {"error": "API endpoint not implemented in preview mode", "path": path}

    # Health check endpoint for service monitoring
    @app.get("/altinn-app-frontend.js")
    async def serve_altinn_frontend_js():
        """Serve the real Altinn frontend JavaScript with DevTools"""
        frontend_file = Path(__file__).parent.parent / "temp" / "app-frontend-react" / "dist" / "altinn-app-frontend.js"
        
        if frontend_file.exists():
            with open(frontend_file, 'r', encoding='utf-8') as f:
                content = f.read()
            return Response(content=content, media_type="application/javascript")
        else:
            raise HTTPException(status_code=404, detail="Altinn frontend not found")

    @app.get("/altinn-app-frontend.css")
    async def serve_altinn_frontend_css():
        """Serve the real Altinn frontend CSS"""
        frontend_file = Path(__file__).parent.parent / "temp" / "app-frontend-react" / "dist" / "altinn-app-frontend.css"
        
        if frontend_file.exists():
            with open(frontend_file, 'r', encoding='utf-8') as f:
                content = f.read()
            return Response(content=content, media_type="text/css")
        else:
            raise HTTPException(status_code=404, detail="Altinn frontend CSS not found")