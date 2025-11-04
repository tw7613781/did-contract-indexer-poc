/**
 * Domain data structure
 */
export interface DomainData {
  id: string;
  name: string;
  did: string;
  note: string;
  allowSubdomain: boolean;
  owner: string;
  subdomains: string[];
}

/**
 * Contract metadata structure
 */
export interface ContractMetadata {
  domain: string;
  did: string;
  notes: string;
  allowSubdomain: boolean;
}

/**
 * Indexer configuration
 */
export interface IndexerConfig {
  rpcUrl: string;
  contractAddress: string;
  batchSize: number;
  concurrency: number;
  retryAttempts: number;
}

/**
 * Progress callback data
 */
export interface ProgressData {
  stage: 'tokenIds' | 'details' | 'subdomains' | 'complete';
  current: number;
  total: number;
  percentage: number;
}

