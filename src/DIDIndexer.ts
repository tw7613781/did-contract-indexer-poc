import { Contract, JsonRpcProvider, Interface } from 'ethers';
import type { DomainData, IndexerConfig, ProgressData, ContractMetadata } from './types';

/**
 * DID Contract Indexer
 * Efficiently indexes all domains from the DID contract using multicall
 */
export class DIDIndexer {
  private contract: Contract;
  private config: IndexerConfig;
  private provider: JsonRpcProvider;
  private contractInterface: Interface;

  constructor(config: IndexerConfig, abi: any[]) {
    this.config = config;
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.contractInterface = new Interface(abi);
    this.contract = new Contract(config.contractAddress, abi, this.provider);
  }

  /**
   * Index all domains from the contract
   */
  async indexAllDomains(
    onProgress?: (progress: ProgressData) => void
  ): Promise<DomainData[]> {
    console.log('🚀 Starting DID Contract indexing...\n');

    // Stage 1: Get total supply
    const totalSupply = await this.getTotalSupply();
    console.log(`📊 Total domains: ${totalSupply}\n`);

    // Stage 2: Batch get all token IDs
    console.log('🔍 Stage 1: Fetching token IDs...');
    const tokenIds = await this.batchGetTokenIds(
      totalSupply,
      (current, total) => {
        const percentage = Math.round((current / total) * 100);
        console.log(`  Progress: ${current}/${total} (${percentage}%)`);
        onProgress?.({
          stage: 'tokenIds',
          current,
          total,
          percentage,
        });
      }
    );
    console.log(`✅ Fetched ${tokenIds.length} token IDs\n`);

    // Stage 3: Batch get domain details
    console.log('🔍 Stage 2: Fetching domain details...');
    const domains = await this.batchGetDomainDetails(
      tokenIds,
      (current, total) => {
        const percentage = Math.round((current / total) * 100);
        console.log(`  Progress: ${current}/${total} (${percentage}%)`);
        onProgress?.({
          stage: 'details',
          current,
          total,
          percentage,
        });
      }
    );
    console.log(`✅ Fetched ${domains.length} domain details\n`);

    // Stage 4: Build subdomain relationships
    console.log('🔗 Stage 3: Building subdomain relationships...');
    const domainsWithSubdomains = this.buildSubdomainRelations(domains);
    console.log(`✅ Completed indexing\n`);

    onProgress?.({
      stage: 'complete',
      current: domains.length,
      total: domains.length,
      percentage: 100,
    });

    return domainsWithSubdomains;
  }

  /**
   * Get total supply of domains
   */
  private async getTotalSupply(): Promise<number> {
    const supply = await this.contract.totalSupply();
    return Number(supply);
  }

  /**
   * Batch get all token IDs using multicall
   */
  private async batchGetTokenIds(
    total: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<string[]> {
    const batches = this.createBatches(total, this.config.batchSize);
    const allTokenIds: string[] = [];
    let processed = 0;

    // Process batches with concurrency control
    const results = await this.concurrentMap(
      batches,
      async (batch) => {
        const tokenIds = await this.multicallTokenByIndex(batch.start, batch.end);
        processed += batch.end - batch.start;
        onProgress?.(processed, total);
        return tokenIds;
      },
      this.config.concurrency
    );

    // Flatten results
    results.forEach((batch) => allTokenIds.push(...batch));
    return allTokenIds;
  }

  /**
   * Execute multicall to get token IDs
   */
  private async multicallTokenByIndex(
    start: number,
    end: number
  ): Promise<string[]> {
    const calls: string[] = [];

    // Encode all tokenByIndex calls
    for (let i = start; i < end; i++) {
      calls.push(this.contractInterface.encodeFunctionData('tokenByIndex', [i]));
    }

    // Execute multicall with retry
    const results = await this.executeMulticallWithRetry(calls);

    // Decode results
    const tokenIds: string[] = [];
    for (const result of results) {
      const decoded = this.contractInterface.decodeFunctionResult('tokenByIndex', result);
      tokenIds.push(decoded[0].toString());
    }

    return tokenIds;
  }

  /**
   * Batch get domain details using multicall
   */
  private async batchGetDomainDetails(
    tokenIds: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<DomainData[]> {
    // For details, we need 2 calls per domain (getMetadata + ownerOf)
    // So we reduce batch size
    const detailBatchSize = Math.floor(this.config.batchSize / 2);
    const batches = this.createBatchesFromArray(tokenIds, detailBatchSize);
    const allDomains: DomainData[] = [];
    let processed = 0;

    const results = await this.concurrentMap(
      batches,
      async (batch) => {
        const domains = await this.multicallGetDetails(batch);
        processed += batch.length;
        onProgress?.(processed, tokenIds.length);
        return domains;
      },
      this.config.concurrency
    );

    // Flatten results
    results.forEach((batch) => allDomains.push(...batch));
    return allDomains;
  }

  /**
   * Execute multicall to get domain details
   */
  private async multicallGetDetails(tokenIds: string[]): Promise<DomainData[]> {
    const calls: string[] = [];

    // Encode getMetadata and ownerOf calls for each token
    // Use full function signatures to avoid ambiguity with overloaded functions
    for (const tokenId of tokenIds) {
      calls.push(this.contractInterface.encodeFunctionData('getMetadata(uint256)', [tokenId]));
      calls.push(this.contractInterface.encodeFunctionData('ownerOf(uint256)', [tokenId]));
    }

    // Execute multicall with retry
    const results = await this.executeMulticallWithRetry(calls);

    // Decode and pair results
    const domains: DomainData[] = [];
    for (let i = 0; i < tokenIds.length; i++) {
      const metadataResult = results[i * 2];
      const ownerResult = results[i * 2 + 1];

      const metadata = this.contractInterface.decodeFunctionResult(
        'getMetadata(uint256)',
        metadataResult
      )[0] as ContractMetadata;

      const owner = this.contractInterface.decodeFunctionResult('ownerOf(uint256)', ownerResult)[0];

      domains.push({
        id: tokenIds[i],
        name: metadata.domain,
        did: metadata.did,
        note: metadata.notes,
        allowSubdomain: metadata.allowSubdomain,
        owner: owner.toLowerCase(),
        subdomains: [],
      });
    }

    return domains;
  }

  /**
   * Execute multicall with retry logic
   */
  private async executeMulticallWithRetry(calls: string[]): Promise<string[]> {
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Use staticCall to force read-only call instead of transaction
        return await this.contract.multicall.staticCall(calls);
      } catch (error) {
        if (attempt === this.config.retryAttempts) {
          console.error(`❌ Multicall failed after ${attempt} attempts`);
          throw error;
        }
        console.warn(`⚠️  Multicall attempt ${attempt} failed, retrying...`);
        // Exponential backoff
        await this.sleep(1000 * attempt);
      }
    }
    throw new Error('Multicall failed');
  }

  /**
   * Build subdomain relationships
   */
  private buildSubdomainRelations(domains: DomainData[]): DomainData[] {
    // Create a map for quick lookup
    const domainMap = new Map<string, DomainData>();
    domains.forEach((d) => domainMap.set(d.name, d));

    // Analyze parent-child relationships
    for (const domain of domains) {
      const parts = domain.name.split('.');
      if (parts.length > 1) {
        // This is a subdomain
        const parentDomain = parts.slice(1).join('.');
        const parent = domainMap.get(parentDomain);
        if (parent && !parent.subdomains.includes(domain.name)) {
          parent.subdomains.push(domain.name);
        }
      }
    }

    return domains;
  }

  /**
   * Create batches from total count
   */
  private createBatches(total: number, batchSize: number): Array<{ start: number; end: number }> {
    const batches: Array<{ start: number; end: number }> = [];
    for (let i = 0; i < total; i += batchSize) {
      batches.push({
        start: i,
        end: Math.min(i + batchSize, total),
      });
    }
    return batches;
  }

  /**
   * Create batches from array
   */
  private createBatchesFromArray<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Execute promises with concurrency limit
   */
  private async concurrentMap<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    concurrency: number
  ): Promise<R[]> {
    const results: R[] = [];
    
    // Process items in chunks based on concurrency
    for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency);
      const chunkResults = await Promise.all(chunk.map(item => fn(item)));
      results.push(...chunkResults);
    }
    
    return results;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get statistics about indexed domains
   */
  static getStatistics(domains: DomainData[]): {
    total: number;
    topLevel: number;
    subdomains: number;
    withDID: number;
    allowingSubdomains: number;
  } {
    return {
      total: domains.length,
      topLevel: domains.filter((d) => !d.name.includes('.')).length,
      subdomains: domains.filter((d) => d.name.includes('.')).length,
      withDID: domains.filter((d) => d.did && d.did !== '').length,
      allowingSubdomains: domains.filter((d) => d.allowSubdomain).length,
    };
  }
}

