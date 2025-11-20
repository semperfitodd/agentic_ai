interface PRAnalysisInput {
  owner: string;
  repo: string;
  readme: string;
  pr: {
    number: number;
    title: string;
    body: string;
    state: string;
    merged_at: string | null;
    user: { login: string } | null;
    labels: string[];
    html_url: string;
    additions: number;
    deletions: number;
    changed_files: number;
  };
  comments: {
    issueComments: Array<{
      user: string;
      body: string;
      created_at: string;
    }>;
    reviewComments: Array<{
      user: string;
      body: string;
      path: string;
      created_at: string;
    }>;
  };
  reviews: Array<{
    user: string;
    state: string;
    body: string;
    submitted_at: string;
  }>;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

/**
 * Mock LLM Analysis Function
 * In production, this would call OpenAI/Anthropic/etc. API
 * For now, it generates a structured analysis based on PR data
 */
async function mockLLMAnalysis(input: PRAnalysisInput): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  const { owner, repo, readme, pr, comments, reviews, files } = input;

  // Extract key information
  const filesSummary = files.map(f => `${f.filename} (+${f.additions}/-${f.deletions})`).join(', ');
  const labelsSummary = pr.labels.length > 0 ? pr.labels.join(', ') : 'none';
  const hasDescription = pr.body && pr.body.length > 50;
  const commentCount = comments.issueComments.length + comments.reviewComments.length;
  const reviewCount = reviews.length;

  // Determine PR category based on files and labels
  let category = 'General';
  if (files.some(f => f.filename.includes('test'))) {
    category = 'Testing';
  } else if (files.some(f => f.filename.includes('.md') || f.filename.includes('README'))) {
    category = 'Documentation';
  } else if (files.some(f => f.filename.includes('config') || f.filename.includes('.yml') || f.filename.includes('.yaml'))) {
    category = 'Configuration';
  } else if (pr.labels.includes('bug') || pr.labels.includes('bugfix')) {
    category = 'Bug Fix';
  } else if (pr.labels.includes('feature') || pr.labels.includes('enhancement')) {
    category = 'Feature';
  }

  // Generate impact assessment
  const totalChanges = pr.additions + pr.deletions;
  let impact = 'Low';
  if (totalChanges > 500) {
    impact = 'High';
  } else if (totalChanges > 100) {
    impact = 'Medium';
  }

  // Generate summary (mocked LLM output)
  const summary = `
**PR #${pr.number}: ${pr.title}**

**Category:** ${category}
**Impact:** ${impact}
**Author:** ${pr.user?.login || 'Unknown'}
**Merged:** ${pr.merged_at ? new Date(pr.merged_at).toLocaleDateString() : 'Not merged'}

**What Changed:**
${hasDescription 
  ? `According to the PR description: ${pr.body?.substring(0, 200)}${pr.body && pr.body.length > 200 ? '...' : ''}`
  : `This PR modified ${pr.changed_files} file(s) with ${pr.additions} additions and ${pr.deletions} deletions.`
}

**Files Modified:**
${filesSummary || 'No files listed'}

**Code Analysis:**
${files.length > 0 
  ? `The changes touch ${files.length} file(s). Key modifications include:\n` + 
    files.slice(0, 3).map(f => `- ${f.filename}: ${f.status} (${f.changes} changes)`).join('\n')
  : 'No file details available.'
}

**Review Process:**
- ${commentCount} comment(s) from the team
- ${reviewCount} review(s) submitted
${reviews.length > 0 ? `- Final review states: ${reviews.map(r => r.state).join(', ')}` : ''}

**Context in Repository:**
${readme.length > 0 
  ? `This change is part of ${repo}, which is: ${readme.substring(0, 150)}...`
  : `This change is part of the ${repo} repository.`
}

**Labels:** ${labelsSummary}

**Link:** ${pr.html_url}
`.trim();

  return summary;
}

export const handler = async (event: PRAnalysisInput) => {
  console.log('Analyzing PR:', JSON.stringify({ 
    owner: event.owner, 
    repo: event.repo, 
    prNumber: event.pr.number 
  }, null, 2));

  try {
    // In production, this would call an actual LLM API:
    // const analysis = await callOpenAI(event);
    // or
    // const analysis = await callAnthropic(event);
    
    const analysis = await mockLLMAnalysis(event);

    console.log(`Analysis complete for PR #${event.pr.number}`);

    return {
      statusCode: 200,
      body: {
        owner: event.owner,
        repo: event.repo,
        prNumber: event.pr.number,
        prTitle: event.pr.title,
        analysis,
        metadata: {
          additions: event.pr.additions,
          deletions: event.pr.deletions,
          changed_files: event.pr.changed_files,
          merged_at: event.pr.merged_at,
          author: event.pr.user?.login,
          labels: event.pr.labels,
        },
      },
    };
  } catch (error: any) {
    console.error('Error analyzing PR:', error);
    return {
      statusCode: 500,
      body: {
        error: error.message || 'Failed to analyze PR',
        owner: event.owner,
        repo: event.repo,
        prNumber: event.pr.number,
      },
    };
  }
};

