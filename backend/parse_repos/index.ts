import { logger, stepResponse } from '@sprint/shared';

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
    return { owner: input.owner, repo: input.repo };
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

  match = urlString.match(/https?:\/\/github\.com\/([^/]+)\/([^/?#]+)/);
  if (match) return { owner: match[1], repo: match[2] };

  match = urlString.match(/git@github\.com:([^/]+)\/(.+)/);
  if (match) return { owner: match[1], repo: match[2] };

  match = urlString.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (match) return { owner: match[1], repo: match[2] };

  match = urlString.match(/^([^/]+)\/([^/]+)$/);
  if (match) return { owner: match[1], repo: match[2] };

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
  logger.info('Parsing repository inputs', { count: event.repos?.length });

  try {
    const parsed: ParsedRepo[] = [];
    const errors: string[] = [];

    for (let i = 0; i < event.repos.length; i++) {
      try {
        const repo = parseGitHubRepo(event.repos[i]);
        parsed.push(repo);
        logger.info(`Parsed repo ${i + 1}`, { owner: repo.owner, repo: repo.repo });
      } catch (err) {
        const msg = `Failed to parse repo at index ${i}: ${err instanceof Error ? err.message : String(err)}`;
        logger.warn(msg);
        errors.push(msg);
      }
    }

    if (parsed.length === 0) {
      throw new Error('No valid repositories could be parsed. Errors: ' + errors.join('; '));
    }

    logger.info(`Successfully parsed ${parsed.length} repositories`);

    return stepResponse(200, {
      repos: parsed,
      since: event.since,
      until: event.until,
      githubToken: event.githubToken,
      sprintName: event.sprintName,
      parseErrors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('Error parsing repositories', { message: error instanceof Error ? error.message : String(error) });
    return stepResponse(500, { error: error instanceof Error ? error.message : 'Failed to parse repositories' });
  }
};
