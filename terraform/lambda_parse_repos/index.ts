interface RepoInput {
  url?: string;
  owner?: string;
  repo?: string;
}

interface ParsedRepo {
  owner: string;
  repo: string;
}

function parseGitHubRepo(input: RepoInput | string): ParsedRepo {
  if (typeof input === 'object' && input.owner && input.repo) {
    return {
      owner: input.owner,
      repo: input.repo,
    };
  }

  let urlString: string;
  if (typeof input === 'string') {
    urlString = input;
  } else if (input.url) {
    urlString = input.url;
  } else {
    throw new Error('Invalid repository input: must provide url or owner/repo');
  }

  urlString = urlString.replace(/\.git$/, '');

  let match: RegExpMatchArray | null;

  match = urlString.match(/https?:\/\/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }

  match = urlString.match(/git@github\.com:([^\/]+)\/(.+)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }

  match = urlString.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }

  match = urlString.match(/^([^\/]+)\/([^\/]+)$/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }

  throw new Error(`Unable to parse GitHub repository from: ${urlString}`);
}

interface ParseReposInput {
  repos: (RepoInput | string)[];
  since: string;
  until: string;
  githubToken: string;
  sprintName?: string;
}

export const handler = async (event: ParseReposInput) => {
  console.log('Parsing repository inputs');

  try {
    const parsedRepos: ParsedRepo[] = [];
    const errors: string[] = [];

    for (let i = 0; i < event.repos.length; i++) {
      try {
        const parsed = parseGitHubRepo(event.repos[i]);
        parsedRepos.push(parsed);
        console.log(`Parsed repo ${i + 1}: ${parsed.owner}/${parsed.repo}`);
      } catch (error: any) {
        const errorMsg = `Failed to parse repo at index ${i}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    if (parsedRepos.length === 0) {
      throw new Error('No valid repositories could be parsed. Errors: ' + errors.join('; '));
    }

    console.log(`Successfully parsed ${parsedRepos.length} repositories`);

    return {
      statusCode: 200,
      body: {
        repos: parsedRepos,
        since: event.since,
        until: event.until,
        githubToken: event.githubToken,
        sprintName: event.sprintName,
        parseErrors: errors.length > 0 ? errors : undefined,
      },
    };
  } catch (error: any) {
    console.error('Error parsing repositories:', error);
    return {
      statusCode: 500,
      body: {
        error: error.message || 'Failed to parse repositories',
      },
    };
  }
};

