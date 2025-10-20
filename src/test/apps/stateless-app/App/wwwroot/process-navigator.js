(function() {
    'use strict';

    if (window.Cypress) {
        return;
    }

    let floatingButton = null;

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    function extractInstanceInfo(hash) {
        const hashPattern = /#\/instance\/(\d+)\/([a-f0-9-]+)\/Task_3$/;
        const match = hash.match(hashPattern);
        
        if (match) {
            return {
                instanceOwnerId: match[1],
                instanceId: match[2]
            };
        }
        return null;
    }

    function createFloatingButton() {
        const button = document.createElement('button');
        button.innerHTML = 'Kjør process/next';
        button.title = 'Gå til neste steg';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            background-color: #022f51;
            color: white;
            border: none;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            transition: all 0.3s ease;
            white-space: nowrap;
        `;
        
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.backgroundColor = '#0369a1';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.backgroundColor = '#022f51';
        });
        
        return button;
    }

    function showFloatingButton(instanceInfo) {
        if (floatingButton) {
            return;
        }
        
        floatingButton = createFloatingButton();
        
        floatingButton.addEventListener('click', function() {
            const org = window.org || window.location.pathname.split('/')[1];
            const app = window.app || window.location.pathname.split('/')[2];
            const url = `/${org}/${app}/instances/${instanceInfo.instanceOwnerId}/${instanceInfo.instanceId}/process/next?language=nb`;
            
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json, text/plain, */*',
            };
            
            const xsrfToken = getCookie('XSRF-TOKEN');
            if (xsrfToken) {
                headers['X-XSRF-TOKEN'] = xsrfToken;
            }
            
            fetch(url, {
                method: 'PUT',
                headers: headers,
            })
            .then(response => {
                if (!response.ok) {
                    alert('Kunne ikke gå til neste steg. Prøv igjen senere.');
                }
            })
            .catch(error => {
                console.error('Error advancing process:', error);
                alert('En feil oppstod. Prøv igjen senere.');
            });
        });
        
        document.body.appendChild(floatingButton);
    }

    function hideFloatingButton() {
        if (floatingButton) {
            floatingButton.remove();
            floatingButton = null;
        }
    }

    function checkUrlAndToggleButton() {
        const hash = window.location.hash;
        const instanceInfo = extractInstanceInfo(hash);
        
        if (instanceInfo) {
            showFloatingButton(instanceInfo);
        } else {
            hideFloatingButton();
        }
    }

    let lastHash = '';
    let pollInterval;

    function startHashMonitoring() {
        function pollHashChange() {
            const currentHash = window.location.hash;
            if (currentHash !== lastHash) {
                lastHash = currentHash;
                checkUrlAndToggleButton();
            }
        }

        // Use multiple approaches to catch hash changes
        window.addEventListener('hashchange', checkUrlAndToggleButton);
        window.addEventListener('popstate', checkUrlAndToggleButton);
        
        // Poll for hash changes (React Router might not trigger events)
        pollInterval = setInterval(pollHashChange, 500);
        
        // Also use MutationObserver to detect DOM changes
        const observer = new MutationObserver(function() {
            setTimeout(checkUrlAndToggleButton, 100);
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });
        
        // Initial check
        checkUrlAndToggleButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startHashMonitoring);
    } else {
        startHashMonitoring();
    }
})();