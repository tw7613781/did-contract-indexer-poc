import { config as loadEnv } from 'dotenv';
import { writeFileSync } from 'fs';
import { DIDIndexer } from './DIDIndexer';
import type { IndexerConfig } from './types';
import abi from './abi/olaresdid.json';

// Load environment variables
loadEnv();

/**
 * Main indexer script
 */
async function main() {
  const startTime = Date.now();

  // Validate environment variables
  const rpcUrl = process.env.RPC_URL;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl || !contractAddress) {
    console.error('❌ Error: Missing required environment variables');
    console.error('   Please set RPC_URL and CONTRACT_ADDRESS in .env file');
    process.exit(1);
  }

  // Configure indexer
  const config: IndexerConfig = {
    rpcUrl,
    contractAddress,
    batchSize: parseInt(process.env.BATCH_SIZE || '500', 10),
    concurrency: parseInt(process.env.CONCURRENCY || '5', 10),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
  };

  console.log('⚙️  Configuration:');
  console.log(`   RPC URL: ${config.rpcUrl}`);
  console.log(`   Contract: ${config.contractAddress}`);
  console.log(`   Batch Size: ${config.batchSize}`);
  console.log(`   Concurrency: ${config.concurrency}`);
  console.log(`   Retry Attempts: ${config.retryAttempts}`);
  console.log('');

  try {
    // Create indexer instance
    const indexer = new DIDIndexer(config, abi);

    // Start indexing
    const domains = await indexer.indexAllDomains();

    // Get statistics
    const stats = DIDIndexer.getStatistics(domains);

    // Print summary
    console.log('📊 Indexing Summary:');
    console.log(`   Total domains: ${stats.total}`);
    console.log(`   Top-level domains: ${stats.topLevel}`);
    console.log(`   Subdomains: ${stats.subdomains}`);
    console.log(`   Domains with DID: ${stats.withDID}`);
    console.log(`   Domains allowing subdomains: ${stats.allowingSubdomains}`);
    console.log('');

    // Calculate time taken
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Time taken: ${duration} seconds`);
    console.log('');

    // Export to JSON file
    const outputFile = process.env.OUTPUT_FILE || 'domains.json';
    const outputData = {
      timestamp: new Date().toISOString(),
      config: {
        rpcUrl: config.rpcUrl,
        contractAddress: config.contractAddress,
      },
      statistics: stats,
      duration: parseFloat(duration),
      domains,
    };

    writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
    console.log(`💾 Exported to: ${outputFile}`);
    console.log('');

    // Sample domains
    if (domains.length > 0) {
      console.log('📝 Sample domains:');
      const sampleCount = Math.min(5, domains.length);
      for (let i = 0; i < sampleCount; i++) {
        const domain = domains[i];
        console.log(`   ${i + 1}. ${domain.name}`);
        console.log(`      ID: ${domain.id}`);
        console.log(`      Owner: ${domain.owner}`);
        console.log(`      DID: ${domain.did || '(empty)'}`);
        console.log(`      Allow Subdomain: ${domain.allowSubdomain}`);
        if (domain.subdomains.length > 0) {
          console.log(`      Subdomains: ${domain.subdomains.length}`);
        }
        console.log('');
      }
    }

    console.log('✅ Indexing completed successfully!');
  } catch (error) {
    console.error('❌ Indexing failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run main function
main();

