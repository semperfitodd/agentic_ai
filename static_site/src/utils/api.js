export const fetchReport = async (executionArn, setMarkdownReport, setShowReportModal, setFetchingReport, setError) => {
    setFetchingReport(true);
    const maxAttempts = 30;
    let attempts = 0;

    const pollReport = async () => {
        try {
            const resultsUrl = `${process.env.REACT_APP_API_URL}/results?executionArn=${encodeURIComponent(executionArn)}`;
            const response = await fetch(resultsUrl, {
                headers: {
                    'x-api-key': process.env.REACT_APP_API_KEY,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API returned ${response.status}: ${errorText}`);
            }

            const data = await response.json();

            if (data.status === 'SUCCEEDED' && data.output) {
                const output = data.output;

                let markdownKey = null;
                if (output.s3Location?.markdownKey) {
                    markdownKey = output.s3Location.markdownKey;
                } else if (output.storedResults?.body?.s3Location?.markdownKey) {
                    markdownKey = output.storedResults.body.s3Location.markdownKey;
                } else if (output.body?.s3Location?.markdownKey) {
                    markdownKey = output.body.s3Location.markdownKey;
                }

                if (markdownKey) {
                    const markdownUrl = `${process.env.REACT_APP_API_URL}/markdown?key=${encodeURIComponent(markdownKey)}`;
                    const markdownResponse = await fetch(markdownUrl, {
                        headers: {
                            'x-api-key': process.env.REACT_APP_API_KEY,
                        },
                    });

                    if (!markdownResponse.ok) {
                        const errorText = await markdownResponse.text();
                        throw new Error(`Markdown API returned ${markdownResponse.status}: ${errorText}`);
                    }

                    const markdownText = await markdownResponse.text();
                    setMarkdownReport(markdownText);
                    setShowReportModal(true);
                    setFetchingReport(false);
                    return;
                }

                setError('Report structure unexpected.');
                setFetchingReport(false);
                return;
            } else if (data.status === 'FAILED') {
                setError('Workflow execution failed: ' + (data.cause || data.error || 'Unknown error'));
                setFetchingReport(false);
                return;
            }

            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(pollReport, 10000);
            } else {
                setError('Report generation timed out after ' + maxAttempts + ' attempts');
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
    const reposList = process.env.REACT_APP_DEFAULT_REPOS.split(',');
    const since = process.env.REACT_APP_DEFAULT_SINCE;
    const until = process.env.REACT_APP_DEFAULT_UNTIL;

    const response = await fetch(`${process.env.REACT_APP_API_URL}/sprint-intelligence`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.REACT_APP_API_KEY,
        },
        body: JSON.stringify({
            sprintName: 'Test Sprint',
            since,
            until,
            githubToken: process.env.REACT_APP_GITHUB_TOKEN,
            repos: reposList,
        }),
    });

    const data = await response.json();

    if (response.ok) {
        return {
            success: true,
            executionArn: data.executionArn,
            repos: reposList,
            dateRange: {since, until},
        };
    } else {
        return {
            success: false,
            error: data.error || 'Failed to start analysis',
        };
    }
};

