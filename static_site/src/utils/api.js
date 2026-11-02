import { getEffectiveSettings, parseRepos, POLL_INTERVAL_MS, MAX_POLL_ATTEMPTS } from '../config/settings';

const getApiUrl = () => import.meta.env.VITE_API_URL;
const fetchWithAuth = (accessToken, url, options = {}) =>
    fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
    });

export const extractMarkdownKey = (output) =>
    output?.s3Location?.markdownKey || output?.body?.s3Location?.markdownKey;

export const extractEmptyReportBody = (output) => output?.body ?? null;

export const buildEmptyReportMarkdown = (body) => {
    if (!body) return null;
    const reportText = body.report;
    if (typeof reportText !== 'string' || !reportText.trim()) return null;

    const lines = ['# Sprint Report', ''];
    if (body.sprintName) lines.push(`**Sprint:** ${body.sprintName}`, '');
    if (body.since && body.until) lines.push(`**Period:** ${body.since} → ${body.until}`, '');
    lines.push(reportText);
    if (body.warning) lines.push('', `> ⚠️ ${body.warning}`);
    return lines.join('\n');
};

export const fetchReport = async (accessToken, executionArn, setMarkdownReport, setShowReportModal, setFetchingReport, setError) => {
    setFetchingReport(true);
    let attempts = 0;

    const pollReport = async () => {
        try {
            const response = await fetchWithAuth(
                accessToken,
                `${getApiUrl()}/results?executionArn=${encodeURIComponent(executionArn)}`
            );

            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${await response.text()}`);
            }

            const data = await response.json();

            if (data.status === 'SUCCEEDED' && data.output) {
                const markdownKey = extractMarkdownKey(data.output);
                if (markdownKey) {
                    const markdownResponse = await fetchWithAuth(
                        accessToken,
                        `${getApiUrl()}/markdown?key=${encodeURIComponent(markdownKey)}`
                    );
                    if (!markdownResponse.ok) {
                        throw new Error(`Markdown API returned ${markdownResponse.status}: ${await markdownResponse.text()}`);
                    }
                    setMarkdownReport(await markdownResponse.text());
                    setShowReportModal(true);
                    setFetchingReport(false);
                    return;
                }

                const emptyMarkdown = buildEmptyReportMarkdown(extractEmptyReportBody(data.output));
                if (emptyMarkdown) {
                    setMarkdownReport(emptyMarkdown);
                    setShowReportModal(true);
                    setFetchingReport(false);
                    return;
                }

                setError('Report structure unexpected — no markdown key found.');
                setFetchingReport(false);
                return;
            }

            if (data.status === 'FAILED') {
                setError('Workflow execution failed: ' + (data.cause || data.error || 'Unknown error'));
                setFetchingReport(false);
                return;
            }

            attempts++;
            if (attempts < MAX_POLL_ATTEMPTS) {
                setTimeout(pollReport, POLL_INTERVAL_MS);
            } else {
                setError(`Report generation timed out after ${MAX_POLL_ATTEMPTS} attempts`);
                setFetchingReport(false);
            }
        } catch (err) {
            attempts++;
            if (attempts < MAX_POLL_ATTEMPTS) {
                setTimeout(pollReport, POLL_INTERVAL_MS);
            } else {
                setError('Failed to fetch report: ' + (err.message || 'Network error'));
                setFetchingReport(false);
            }
        }
    };

    pollReport();
};

export const startSprintAnalysis = async (accessToken) => {
    const settings = getEffectiveSettings();

    const reposList = parseRepos(settings.repos);
    if (reposList.length === 0) {
        return { success: false, error: 'At least one repository is required. Configure it in Settings.' };
    }

    try {
        const response = await fetchWithAuth(accessToken, `${getApiUrl()}/sprint-intelligence`, {
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

        let data;
        try {
            data = await response.json();
        } catch {
            return { success: false, error: `Unexpected server response (${response.status})` };
        }

        if (!response.ok) {
            return { success: false, error: data?.error || `Request failed with status ${response.status}` };
        }

        return {
            success: true,
            executionArn: data.executionArn,
            repos: reposList,
            dateRange: { since: settings.since, until: settings.until },
        };
    } catch (err) {
        return { success: false, error: err.message || 'Network error — could not reach the API.' };
    }
};

export const deleteAccount = async (accessToken) => {
    const response = await fetchWithAuth(accessToken, `${getApiUrl()}/account`, { method: 'DELETE' });
    if (!response.ok) {
        throw new Error(`Account deletion failed (${response.status})`);
    }
};
