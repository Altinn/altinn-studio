"""Documentation search and indexing system for planning tool."""
import os
import re
import json
import hashlib
import time
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
import requests
from bs4 import BeautifulSoup


class DocumentationCache:
    """Manages caching of fetched documentation."""
    
    def __init__(self, cache_dir: str, cache_days: int = 7):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_days = cache_days
        self.cache_seconds = cache_days * 24 * 60 * 60
    
    def _get_cache_path(self, url: str) -> Path:
        """Generate cache file path from URL."""
        url_hash = hashlib.md5(url.encode()).hexdigest()
        return self.cache_dir / f"{url_hash}.json"
    
    def get(self, url: str) -> Optional[Dict]:
        """Retrieve cached content if fresh."""
        cache_path = self._get_cache_path(url)
        
        if not cache_path.exists():
            return None
        
        # Check age
        age = time.time() - cache_path.stat().st_mtime
        if age > self.cache_seconds:
            return None
        
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None
    
    def set(self, url: str, data: Dict):
        """Cache content."""
        cache_path = self._get_cache_path(url)
        try:
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except IOError:
            pass  # Fail silently on cache write errors
    
    def clear(self):
        """Clear all cached content."""
        for cache_file in self.cache_dir.glob("*.json"):
            try:
                cache_file.unlink()
            except IOError:
                pass


class DocumentFetcher:
    """Fetches and extracts content from documentation URLs."""
    
    def __init__(self, cache: DocumentationCache):
        self.cache = cache
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Altinity-MCP-Bot/1.0'
        })
    
    def fetch(self, url: str, rate_limit_delay: float = 0.5) -> Optional[Dict]:
        """Fetch documentation content with caching."""
        # Check cache first
        cached = self.cache.get(url)
        if cached:
            return cached
        
        # Fetch from URL
        try:
            time.sleep(rate_limit_delay)  # Rate limiting
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            # Extract content
            content = self._extract_content(response.text, url)
            
            # Cache and return
            self.cache.set(url, content)
            return content
            
        except (requests.RequestException, Exception) as e:
            import sys
            print(f"Error fetching {url}: {e}", file=sys.stderr, flush=True)
            return None
    
    def _extract_content(self, html: str, url: str) -> Dict:
        """Extract main content from HTML."""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Try to find main content area
        main_content = (
            soup.find('main') or 
            soup.find('article') or
            soup.find('div', class_='content') or
            soup.find('body')
        )
        
        if not main_content:
            return {
                'url': url,
                'title': '',
                'headings': [],
                'body': '',
                'code_blocks': []
            }
        
        # Extract title
        title_tag = soup.find('h1') or soup.find('title')
        title = title_tag.get_text().strip() if title_tag else ''
        
        # Extract headings (h2, h3)
        headings = []
        for tag in main_content.find_all(['h2', 'h3']):
            heading_text = tag.get_text().strip()
            if heading_text:
                headings.append(heading_text)
        
        # Extract body text (excluding navigation, headers, footers)
        for unwanted in main_content.find_all(['nav', 'header', 'footer', 'aside']):
            unwanted.decompose()
        
        body = main_content.get_text(separator=' ', strip=True)
        
        # Extract code blocks
        code_blocks = []
        for code in main_content.find_all(['code', 'pre']):
            code_text = code.get_text().strip()
            if code_text and len(code_text) > 10:  # Skip very short snippets
                code_blocks.append(code_text)
        
        return {
            'url': url,
            'title': title,
            'headings': headings,
            'body': body,
            'code_blocks': code_blocks
        }


class DocumentIndex:
    """Inverted index for fast keyword search with synonym support."""
    
    # Synonym mappings for query expansion
    SYNONYMS = {
        'conditional': ['dynamic', 'hidden', 'show', 'hide', 'visible', 'visibility'],
        'rendering': ['dynamic', 'expressions', 'hidden', 'show', 'hide'],
        'visibility': ['hidden', 'show', 'hide', 'visible', 'dynamic'],
        'bindings': ['datamodelbindings', 'binding', 'bind', 'datamodel'],
        'validation': ['validate', 'validator', 'valid', 'required'],
        'rules': ['rule', 'validation', 'logic'],
        'form': ['input', 'field', 'component'],
        'component': ['field', 'input', 'element'],
        'layout': ['ui', 'form', 'components'],
    }
    
    def __init__(self):
        self.index: Dict[str, List[Tuple[int, float, List[int]]]] = defaultdict(list)
        self.documents: List[Dict] = []
    
    def add_document(self, doc: Dict, doc_id: Optional[int] = None) -> int:
        """Add document to index."""
        if doc_id is None:
            doc_id = len(self.documents)
            self.documents.append(doc)
        
        url = doc['url']
        title = doc.get('title', '')
        headings = doc.get('headings', [])
        body = doc.get('body', '')
        code_blocks = doc.get('code_blocks', [])
        
        # Index title (weight: 10)
        self._index_text(title, doc_id, weight=10.0)
        
        # Index URL path segments (weight: 3)
        url_terms = self._extract_url_terms(url)
        for term in url_terms:
            self._add_to_index(term.lower(), doc_id, weight=3.0, position=-1)
        
        # Index headings (weight: 5)
        for heading in headings:
            self._index_text(heading, doc_id, weight=5.0)
        
        # Index code blocks (weight: 3)
        for code in code_blocks:
            self._index_text(code, doc_id, weight=3.0)
        
        # Index body (weight: 1)
        self._index_text(body, doc_id, weight=1.0)
        
        return doc_id
    
    def _extract_url_terms(self, url: str) -> List[str]:
        """Extract meaningful terms from URL path."""
        # Get path component
        match = re.search(r'https?://[^/]+/(.+?)(?:\?|#|$)', url)
        if not match:
            return []
        
        path = match.group(1)
        # Split on /, -, _
        terms = re.split(r'[/_-]+', path)
        # Filter out common words and short terms
        stop_words = {'en', 'no', 'docs', 'www', 'http', 'https', 'html', 'index'}
        return [t for t in terms if len(t) > 2 and t.lower() not in stop_words]
    
    def _index_text(self, text: str, doc_id: int, weight: float):
        """Tokenize and index text."""
        if not text:
            return
        
        # Simple tokenization: lowercase, keep alphanumeric
        tokens = re.findall(r'\b[a-z0-9]+\b', text.lower())
        
        for position, token in enumerate(tokens):
            if len(token) > 2:  # Skip very short tokens
                self._add_to_index(token, doc_id, weight, position)
    
    def _add_to_index(self, term: str, doc_id: int, weight: float, position: int):
        """Add term occurrence to index."""
        # Check if this doc already has this term
        for entry in self.index[term]:
            if entry[0] == doc_id:
                # Update existing entry
                entry[2].append(position)
                return
        
        # New entry for this doc
        self.index[term].append((doc_id, weight, [position] if position >= 0 else []))
    
    def search(self, query: str, top_k: int = 3, include_full_content: bool = True) -> List[Dict]:
        """Search index for query terms with synonym expansion and improved ranking.
        
        Args:
            query: Search query string
            top_k: Maximum number of results to return
            include_full_content: If True, include full document content in results.
                                 If False, only include excerpt. Default True.
        
        Returns:
            List of result dictionaries with metadata and optionally full content.
        """
        if not query or not query.strip():
            return []
        
        # Tokenize query
        query_terms = re.findall(r'\b[a-z0-9]+\b', query.lower())
        query_terms = [t for t in query_terms if len(t) > 2]
        
        if not query_terms:
            return []
        
        # Expand query with synonyms
        expanded_terms = set(query_terms)
        for term in query_terms:
            if term in self.SYNONYMS:
                expanded_terms.update(self.SYNONYMS[term])
        
        # Score documents
        doc_scores: Dict[int, float] = defaultdict(float)
        doc_matched_terms: Dict[int, List[str]] = defaultdict(list)
        doc_direct_matches: Dict[int, int] = defaultdict(int)  # Count exact query term matches
        
        import math
        
        for term in expanded_terms:
            if term in self.index:
                is_direct = term in query_terms
                for doc_id, weight, positions in self.index[term]:
                    frequency = len(positions) if positions else 1
                    # Base score from weight and frequency
                    score = weight * math.log(frequency + 1)
                    
                    # Boost direct query matches significantly
                    if is_direct:
                        score *= 2.0
                        doc_direct_matches[doc_id] += 1
                    else:
                        # Synonym matches get reduced weight
                        score *= 0.5
                    
                    doc_scores[doc_id] += score
                    if is_direct:
                        doc_matched_terms[doc_id].append(term)
        
        # Apply sophisticated ranking bonuses
        for doc_id in doc_scores:
            # Bonus for matching more unique query terms (not just synonyms)
            direct_matches = doc_direct_matches.get(doc_id, 0)
            unique_matches = len(set(doc_matched_terms[doc_id]))
            
            # Strong bonus for matching multiple unique query terms
            if unique_matches > 1:
                doc_scores[doc_id] += (unique_matches - 1) * 5.0
            
            # Extra bonus for high percentage of query coverage
            coverage = direct_matches / len(query_terms) if query_terms else 0
            doc_scores[doc_id] += coverage * 10.0
        
        # Sort by score
        sorted_docs = sorted(doc_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Filter by minimum score and apply result diversity
        min_score = 3.0  # Lowered threshold to catch synonym matches
        results = []
        seen_titles = set()  # Track titles to avoid duplicates
        
        # Process top candidates (fetch more than top_k to allow for deduplication)
        for doc_id, score in sorted_docs[:top_k * 3]:
            if len(results) >= top_k:
                break
                
            if score < min_score:
                continue
            
            doc = self.documents[doc_id]
            title = doc.get('title', 'Untitled')
            
            # Check for duplicate/similar titles
            title_normalized = title.lower().strip()
            if title_normalized in seen_titles:
                continue
            
            seen_titles.add(title_normalized)
            matched_terms = list(set(doc_matched_terms[doc_id]))
            
            # Generate excerpt
            excerpt = self._generate_excerpt(doc, matched_terms)
            
            # Better score normalization based on actual max score
            max_score_seen = sorted_docs[0][1] if sorted_docs else score
            normalized_score = min(1.0, score / max(max_score_seen, 1.0))
            
            result = {
                'title': title,
                'url': doc['url'],
                'excerpt': excerpt,
                'relevance_score': round(normalized_score, 3),
                'matched_terms': matched_terms,
                'raw_score': round(score, 2),
                'query_coverage': round(doc_direct_matches.get(doc_id, 0) / len(query_terms), 2) if query_terms else 0
            }
            
            # Include full content if requested
            if include_full_content:
                result['full_content'] = doc.get('body', '')
                result['headings'] = doc.get('headings', [])
                result['content_length'] = len(doc.get('body', ''))
            
            results.append(result)
        
        return results
    
    def _generate_excerpt(self, doc: Dict, matched_terms: List[str], max_length: int = 200) -> str:
        """Generate short excerpt highlighting matched terms."""
        body = doc.get('body', '')
        
        if not body:
            # Fallback to headings or title
            headings = doc.get('headings', [])
            if headings:
                return headings[0][:max_length]
            return doc.get('title', '')[:max_length]
        
        # Try to find a sentence containing matched terms
        sentences = re.split(r'[.!?]+', body)
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            if any(term in sentence_lower for term in matched_terms):
                excerpt = sentence.strip()
                if len(excerpt) > max_length:
                    excerpt = excerpt[:max_length] + "..."
                return excerpt
        
        # Fallback: first N characters
        excerpt = body[:max_length].strip()
        if len(body) > max_length:
            excerpt += "..."
        return excerpt


class DocumentationSearch:
    """Main search interface for documentation."""
    
    def __init__(self, llms_file: str, cache_dir: str, cache_days: int = 7):
        self.llms_file = llms_file
        self.cache = DocumentationCache(cache_dir, cache_days)
        self.fetcher = DocumentFetcher(self.cache)
        self.index = DocumentIndex()
        self._initialized = False
    
    def _parse_llms_full(self) -> List[Tuple[str, str]]:
        """Parse llms-full.txt for title and URL pairs."""
        entries = []
        
        with open(self.llms_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Split by page markers
        pages = re.split(r'<\|firecrawl-page-\d+-lllmstxt\|>', content)
        
        for page in pages[1:]:  # Skip first empty split
            if not page.strip():
                continue
            
            # Extract main title from ## heading
            title_match = re.search(r'^## (.+?)$', page, re.MULTILINE)
            if not title_match:
                continue
            
            main_title = title_match.group(1)
            
            # First, try to extract individual documentation links from list items
            # Pattern: - [Link Text](https://docs.altinn.studio/...)
            # Description text
            link_pattern = r'-\s*\[(.+?)\]\((https://docs\.altinn\.studio/[^\)]+)\)'
            link_matches = re.findall(link_pattern, page)
            
            if link_matches:
                # Found list of links - extract each as separate entry
                for link_title, url in link_matches:
                    # Clean up URL (remove trailing parentheses or other chars)
                    url = url.rstrip('/')
                    entries.append((link_title, url))
            else:
                # No list links found, try main page URL patterns
                # Pattern 1: GitHub edit link -> convert to docs URL
                url_match = re.search(r'\[Edit page on GitHub\]\((https://[^\)]+)\)', page)
                if url_match:
                    github_url = url_match.group(1)
                    # Convert GitHub edit URL to docs URL
                    # https://github.com/altinn/altinn-studio-docs/blob/master/content/path/_index.en.md
                    # -> https://docs.altinn.studio/en/path/
                    path_match = re.search(r'/content/(.*?)/_index\.en\.md', github_url)
                    if path_match:
                        path = path_match.group(1)
                        url = f"https://docs.altinn.studio/en/{path}"
                        entries.append((main_title, url))
                        continue
                
                # Pattern 2: Direct docs.altinn.studio URL anywhere in page
                url_match = re.search(r'(https://docs\.altinn\.studio/[^\s\)]+)', page)
                if url_match:
                    url = url_match.group(1).rstrip('/')
                    entries.append((main_title, url))
        
        return entries
    
    def initialize(self, max_docs: Optional[int] = None, rate_limit: float = 0.5, verbose: bool = False):
        """Fetch and index documentation."""
        import sys
        
        if self._initialized:
            return
        
        def log(msg: str):
            """Log to stderr to avoid interfering with stdio JSON-RPC."""
            if verbose:
                print(msg, file=sys.stderr, flush=True)
        
        log("Initializing documentation search...")
        
        # Parse llms-full.txt for URLs
        doc_entries = self._parse_llms_full()
        log(f"Found {len(doc_entries)} documentation URLs")
        
        # Limit if requested
        if max_docs:
            doc_entries = doc_entries[:max_docs]
            log(f"Limiting to first {max_docs} documents")
        
        # Fetch and index documents
        fetched_count = 0
        cached_count = 0
        for title, url in doc_entries:
            # Check if already cached
            cached = self.cache.get(url)
            if cached:
                self.index.add_document(cached)
                fetched_count += 1
                cached_count += 1
            else:
                log(f"Fetching: {title} ({url})")
                doc = self.fetcher.fetch(url, rate_limit_delay=rate_limit)
                if doc:
                    self.index.add_document(doc)
                    fetched_count += 1
                else:
                    log(f"  Failed to fetch {url}")
        
        log(f"Indexed {fetched_count} documents ({cached_count} from cache)")
        self._initialized = True
    
    def search(self, query: str, max_results: int = 3, include_full_content: bool = True) -> List[Dict]:
        """Search documentation.
        
        Args:
            query: Search query string
            max_results: Maximum number of results to return
            include_full_content: If True, include full document content in results
        
        Returns:
            List of search results with metadata and optionally full content
        """
        import sys
        
        if not self._initialized:
            print("⚠️  Documentation not pre-initialized, fetching now (may take 30-60s)...", file=sys.stderr, flush=True)
            self.initialize(max_docs=None, verbose=True)  # Fetch all documents with logging
        
        return self.index.search(query, top_k=max_results, include_full_content=include_full_content)
    
    def force_refresh(self):
        """Clear cache and rebuild index."""
        self.cache.clear()
        self.index = DocumentIndex()
        self._initialized = False
