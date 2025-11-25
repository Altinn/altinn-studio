window.org = '{{ORG}}';
window.app = '{{APP}}';

(async function () {
    try {
        // Debug: Log all cookies
        console.log('All cookies:', document.cookie);

        const xsrfToken = document.cookie
            .split('; ')
            .find((row) => row.startsWith('XSRF-TOKEN='))
            ?.split('=')[1];

        console.log('XSRF Token found:', xsrfToken ? 'yes' : 'no');

        if (!xsrfToken) {
            const errorParams = new URLSearchParams({
                errorType: 'xsrf_token_missing',
                statusCode: '403',
            });
            window.location.href = '/{{ORG}}/{{APP}}/error?' + errorParams.toString();
            return;
        }

        console.log('Attempting to create instance...');
        const response = await fetch(
            '/{{ORG}}/{{APP}}/instances?instanceOwnerPartyId={{PARTY_ID}}',
            {
                method: 'POST',
                headers: {
                    'X-XSRF-TOKEN': xsrfToken,
                    'Content-Type': 'application/json',
                },
            },
        );

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorDetail;
            if (contentType && contentType.includes('application/json')) {
                errorDetail = await response.json();
                console.error('Error response (JSON):', errorDetail);
            } else {
                errorDetail = await response.text();
                console.error('Error response (text):', errorDetail);
            }

            const errorParams = new URLSearchParams({
                errorType: response.status >= 500 ? 'server_error' : 'instance_creation_failed',
                statusCode: response.status.toString(),
                showContactInfo: 'true',
            });
            window.location.href = '/{{ORG}}/{{APP}}/error?' + errorParams.toString();
            return;
        }

        const instance = await response.json();
        const [partyId, instanceGuid] = instance.id.split('/');
        const taskId = instance.process.currentTask.elementId;

        let firstPageId = null;
        if (window.AltinnLayoutSets && window.AltinnLayoutSets.sets) {
            const layoutSet = window.AltinnLayoutSets.sets.find(
                (set) => set.tasks && set.tasks.includes(taskId),
            );
            if (layoutSet && layoutSet.id) {
                const settingsResponse = await fetch(
                    '/{{ORG}}/{{APP}}/api/layoutsettings/' + layoutSet.id,
                );
                if (settingsResponse.ok) {
                    const settings = await settingsResponse.json();
                    if (settings.pages && settings.pages.order && settings.pages.order.length > 0) {
                        firstPageId = settings.pages.order[0];
                    }
                }
            }
        }

        const redirectUrl =
            '/{{ORG}}/{{APP}}/instance/' +
            partyId +
            '/' +
            instanceGuid +
            '/' +
            taskId +
            '/' +
            (firstPageId || '');
        window.location.href = redirectUrl;
    } catch (error) {
        console.error('Error creating instance:', error);
        const errorParams = new URLSearchParams({
            errorType: 'network_error',
            showContactInfo: 'false',
        });
        window.location.href = '/{{ORG}}/{{APP}}/error?' + errorParams.toString();
    }
})();
