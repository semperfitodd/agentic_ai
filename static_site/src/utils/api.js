import { getEffectiveSettings } from '../components/SettingsModal';

const API_URL = process.env.REACT_APP_API_URL;
const API_KEY = process.env.REACT_APP_API_KEY;

const fetchWithAuth = (url, options = {}) =>
    fetch(url, {
        ...options,
        headers: { ...options.headers, 'x-api-key': API_KEY },
    });

const extractMarkdownKey = (output) =>
    output.s3Location?.markdownKey ||
    output.storedResults?.body?.s3Location?.markdownKey ||
    output.body?.s3Location?.markdownKey;

export const fetchReport = async (executionArn, setMarkdownReport, setShowReportModal, setFetchingReport, setError) => {
    setFetchingReport(true);
    const maxAttempts = 30;
    let attempts = 0;

    const pollReport = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/results?executionArn=${encodeURIComponent(executionArn)}`
            );

            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${await response.text()}`);
            }

            const data = await response.json();

            if (data.status === 'SUCCEEDED' && data.output) {
                const markdownKey = extractMarkdownKey(data.output);
                if (markdownKey) {
                    const markdownResponse = await fetchWithAuth(
                        `${API_URL}/markdown?key=${encodeURIComponent(markdownKey)}`
                    );
                    if (!markdownResponse.ok) {
                        throw new Error(`Markdown API returned ${markdownResponse.status}: ${await markdownResponse.text()}`);
                    }
                    setMarkdownReport(await markdownResponse.text());
                    setShowReportModal(true);
                    setFetchingReport(false);
                    return;
                }
                setError('Report structure unexpected.');
                setFetchingReport(false);
                return;
            }

            if (data.status === 'FAILED') {
                setError('Workflow execution failed: ' + (data.cause || data.error || 'Unknown error'));
                setFetchingReport(false);
                return;
            }

            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(pollReport, 10000);
            } else {
                setError(`Report generation timed out after ${maxAttempts} attempts`);
                setFetchingReport(false);
            }
        } catch (err) {
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(pollReport, 10000);
            } else {
                setError('Failed to fetch report: ' + err.message);
                setFetchingReport(false);
            }
        }
    };

    pollReport();
};

export const startSprintAnalysis = async () => {
    const settings = getEffectiveSettings();
    const reposList = settings.repos.split(',').map(r => r.trim()).filter(Boolean);

    const response = await fetchWithAuth(`${API_URL}/sprint-intelligence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sprintName: settings.sprintName,
            since: settings.since,
            until: settings.until,
            githubToken: settings.githubToken,
            repos: reposList,
        }),
    });

    const data = await response.json();

    return response.ok
        ? {
            success: true,
            executionArn: data.executionArn,
            repos: reposList,
            dateRange: { since: settings.since, until: settings.until },
        }
        : { success: false, error: data.error || 'Failed to start analysis' };
};
