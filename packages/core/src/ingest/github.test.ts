import { describe, expect, it } from 'vitest';
import {
  classifyGitHubError,
  computeCommitQuality,
  extractTotalCountFromLinkHeader,
  GitHubIngestError,
} from './github';

describe('classifyGitHubError', () => {
  it('classifies 403 as rate_limited', () => {
    expect(classifyGitHubError({ status: 403 })).toBe('rate_limited');
  });

  it('classifies 429 as rate_limited', () => {
    expect(classifyGitHubError({ status: 429 })).toBe('rate_limited');
  });

  it('classifies 401 as auth', () => {
    expect(classifyGitHubError({ status: 401 })).toBe('auth');
  });

  it('classifies 404 as not_found', () => {
    expect(classifyGitHubError({ status: 404 })).toBe('not_found');
  });

  it('classifies 502 as network', () => {
    expect(classifyGitHubError({ status: 502 })).toBe('network');
  });

  it('classifies 503 as network', () => {
    expect(classifyGitHubError({ status: 503 })).toBe('network');
  });

  it('classifies 504 as network', () => {
    expect(classifyGitHubError({ status: 504 })).toBe('network');
  });

  it('classifies unknown status as unknown', () => {
    expect(classifyGitHubError({ status: 500 })).toBe('unknown');
  });

  it('classifies by message: rate limit', () => {
    expect(classifyGitHubError(new Error('API rate limit exceeded'))).toBe('rate_limited');
  });

  it('classifies by message: secondary rate', () => {
    expect(classifyGitHubError(new Error('Secondary rate limit hit'))).toBe('rate_limited');
  });

  it('classifies by message: not found', () => {
    expect(classifyGitHubError(new Error('User not found'))).toBe('not_found');
  });

  it('classifies by message: bad credentials', () => {
    expect(classifyGitHubError(new Error('Bad credentials'))).toBe('auth');
  });

  it('classifies by message: unauthorized', () => {
    expect(classifyGitHubError(new Error('Unauthorized access'))).toBe('auth');
  });

  it('classifies by message: fetch failed', () => {
    expect(classifyGitHubError(new Error('fetch failed'))).toBe('network');
  });

  it('classifies by message: timeout', () => {
    expect(classifyGitHubError(new Error('Request timeout'))).toBe('network');
  });

  it('classifies by message: econnreset', () => {
    expect(classifyGitHubError(new Error('read ECONNRESET'))).toBe('network');
  });

  it('classifies string errors', () => {
    expect(classifyGitHubError('something went wrong')).toBe('unknown');
  });

  it('classifies errors with response.status', () => {
    expect(classifyGitHubError({ response: { status: 404 } })).toBe('not_found');
  });

  it('classifies unknown errors without status', () => {
    expect(classifyGitHubError({ foo: 'bar' })).toBe('unknown');
  });

  it('classifies null/undefined as unknown', () => {
    expect(classifyGitHubError(null)).toBe('unknown');
    expect(classifyGitHubError(undefined)).toBe('unknown');
  });
});

describe('computeCommitQuality', () => {
  it('returns zeros for empty commits', () => {
    const result = computeCommitQuality([]);
    expect(result).toEqual({
      avgLen: 0,
      meaningful: 0,
      sampled: 0,
      firstCommitAt: null,
      lastCommitAt: null,
    });
  });

  it('returns zeros when all messages are empty', () => {
    const result = computeCommitQuality([
      { commit: { message: '' } },
      { commit: { message: '   ' } },
    ]);
    expect(result.sampled).toBe(0);
    expect(result.avgLen).toBe(0);
  });

  it('computes average message length', () => {
    const result = computeCommitQuality([
      { commit: { message: 'feat: add scoring\n\nbody' } },
      { commit: { message: 'fix: bug' } },
    ]);
    // first lines: "feat: add scoring" (17) and "fix: bug" (8) → avg = 12.5 → 13
    expect(result.sampled).toBe(2);
    expect(result.avgLen).toBe(13);
  });

  it('counts meaningful messages', () => {
    const result = computeCommitQuality([
      { commit: { message: 'feat: add new scoring algorithm' } },
      { commit: { message: 'wip' } },
      { commit: { message: 'fix: resolve auth issue' } },
      { commit: { message: 'tmp' } },
    ]);
    expect(result.sampled).toBe(4);
    expect(result.meaningful).toBe(0.5); // 2 of 4
  });

  it('detects long messages as meaningful even without conventional verb', () => {
    const result = computeCommitQuality([
      { commit: { message: 'This is a very long commit message that exceeds thirty chars' } },
    ]);
    expect(result.meaningful).toBe(1);
  });

  it('detects trivial messages', () => {
    const trivial = ['wip', 'tmp', 'fix', 'update', 'typo', 'init', 'save', 'y', 'stuff'];
    for (const msg of trivial) {
      const result = computeCommitQuality([{ commit: { message: msg } }]);
      expect(result.meaningful, `message "${msg}" should be trivial`).toBe(0);
    }
  });

  it('detects meaningful verb prefixes', () => {
    const verbs = ['feat: x', 'fix: x', 'refactor: x', 'docs: x', 'test: x', 'perf: x',
      'chore: x', 'style: x', 'ci: x', 'build: x', 'revert: x', 'add: x', 'remove: x'];
    for (const msg of verbs) {
      const result = computeCommitQuality([{ commit: { message: msg } }]);
      expect(result.meaningful, `message "${msg}" should be meaningful`).toBe(1);
    }
  });

  it('extracts commit dates from author', () => {
    const result = computeCommitQuality([
      { commit: { message: 'feat: x', author: { date: '2024-01-15T00:00:00Z' } } },
      { commit: { message: 'feat: y', author: { date: '2024-06-20T00:00:00Z' } } },
    ]);
    expect(result.firstCommitAt).toBe(new Date('2024-01-15T00:00:00Z').getTime());
    expect(result.lastCommitAt).toBe(new Date('2024-06-20T00:00:00Z').getTime());
  });

  it('falls back to committer date when author date is missing', () => {
    const result = computeCommitQuality([
      { commit: { message: 'feat: x', committer: { date: '2024-03-10T00:00:00Z' } } },
    ]);
    expect(result.firstCommitAt).toBe(new Date('2024-03-10T00:00:00Z').getTime());
    expect(result.lastCommitAt).toBe(new Date('2024-03-10T00:00:00Z').getTime());
  });

  it('handles invalid dates', () => {
    const result = computeCommitQuality([
      { commit: { message: 'feat: x', author: { date: 'invalid' } } },
    ]);
    expect(result.firstCommitAt).toBeNull();
    expect(result.lastCommitAt).toBeNull();
  });

  it('uses only first line of multi-line messages', () => {
    const result = computeCommitQuality([
      { commit: { message: 'feat: add feature\n\nDetailed body text here' } },
    ]);
    expect(result.sampled).toBe(1);
    expect(result.avgLen).toBe('feat: add feature'.length);
  });

  it('filters empty first lines', () => {
    const result = computeCommitQuality([
      { commit: { message: '\n\nfeat: add feature' } },
      { commit: { message: 'fix: bug' } },
    ]);
    // First message's first line is empty, filtered out
    expect(result.sampled).toBe(1);
  });
});

describe('extractTotalCountFromLinkHeader', () => {
  it('returns null for undefined', () => {
    expect(extractTotalCountFromLinkHeader(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractTotalCountFromLinkHeader('')).toBeNull();
  });

  it('extracts page count from standard GitHub link header', () => {
    const link =
      '<https://api.github.com/repos/owner/repo/contributors?page=2>; rel="next", ' +
      '<https://api.github.com/repos/owner/repo/contributors?page=5>; rel="last"';
    expect(extractTotalCountFromLinkHeader(link)).toBe(5);
  });

  it('extracts from header with additional query params', () => {
    const link =
      '<https://api.github.com/repos/owner/repo/releases?page=3&per_page=1>; rel="last"';
    expect(extractTotalCountFromLinkHeader(link)).toBe(3);
  });

  it('returns null when no last relation', () => {
    const link = '<https://api.github.com/repos/owner/repo?page=2>; rel="next"';
    expect(extractTotalCountFromLinkHeader(link)).toBeNull();
  });

  it('returns null for malformed header', () => {
    expect(extractTotalCountFromLinkHeader('garbage')).toBeNull();
  });
});

describe('GitHubIngestError', () => {
  it('creates error with reason', () => {
    const err = new GitHubIngestError('test message', 'rate_limited');
    expect(err.message).toBe('test message');
    expect(err.reason).toBe('rate_limited');
    expect(err.name).toBe('GitHubIngestError');
  });

  it('supports all reason types', () => {
    const reasons = ['rate_limited', 'not_found', 'auth', 'network', 'unknown'] as const;
    for (const reason of reasons) {
      const err = new GitHubIngestError('msg', reason);
      expect(err.reason).toBe(reason);
    }
  });

  it('is an Error instance', () => {
    const err = new GitHubIngestError('msg', 'unknown');
    expect(err).toBeInstanceOf(Error);
  });
});
