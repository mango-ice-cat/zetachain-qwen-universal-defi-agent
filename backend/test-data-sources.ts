/**
 * Test script for data sources integration
 * Run with: npx ts-node -r tsconfig-paths/register test-data-sources.ts
 */

import dotenv from 'dotenv';
import { chainDataService } from './src/services/dataSources/chainDataService';
import { priceService } from './src/services/dataSources/priceService';
import { protocolService } from './src/services/dataSources/protocolService';
import { dataFetcher } from './src/services/dataFetcher';

dotenv.config();

async function testPriceService() {
  console.log('\n=== Testing Price Service ===');
  try {
    const prices = await priceService.getPrices(['ETH', 'USDC', 'SOL', 'ZETA']);
    console.log('Prices:', prices);
  } catch (error: any) {
    console.error('Price service error:', error.message);
  }
}

async function testProtocolService() {
  console.log('\n=== Testing Protocol Service ===');
  try {
    const protocols = await protocolService.getProtocols();
    console.log(`Found ${protocols.length} protocols:`);
    protocols.forEach(p => {
      console.log(`  - ${p.name} (${p.chain}): ${p.apy}% APY`);
    });
  } catch (error: any) {
    console.error('Protocol service error:', error.message);
  }
}

async function testChainDataService() {
  console.log('\n=== Testing Chain Data Service ===');
  // Use user's address
  const testAddress = '0x4f5D82A86b216587BdA6866Ef54fD57F3F627825';
  
  try {
    console.log(`Testing with address: ${testAddress}`);
    const ethBalance = await chainDataService.getNativeBalance('ETH', testAddress);
    console.log(`ETH balance: ${ethBalance}`);
    
    const usdcBalance = await chainDataService.getTokenBalance('ETH', testAddress, 'USDC');
    console.log(`USDC balance: ${usdcBalance}`);
    
    const usdtBalance = await chainDataService.getTokenBalance('ETH', testAddress, 'USDT');
    console.log(`USDT balance: ${usdtBalance}`);
  } catch (error: any) {
    console.error('Chain data service error:', error.message);
  }
}

async function testDataFetcher() {
  console.log('\n=== Testing Data Fetcher (Full Integration) ===');
  const testAddress = '0x4f5D82A86b216587BdA6866Ef54fD57F3F627825';
  
  try {
    console.log(`Fetching asset overview for: ${testAddress}`);
    const overview = await dataFetcher.getAssetOverview(testAddress);
    console.log(`Total USD value: $${overview.totalsUSD.toFixed(2)}`);
    console.log(`Assets found: ${overview.assets.length}`);
    overview.assets.forEach(asset => {
      console.log(`  - ${asset.symbol} (${asset.chain}): ${asset.balance} = $${asset.valueUSD.toFixed(2)}`);
    });
  } catch (error: any) {
    console.error('Data fetcher error:', error.message);
  }
}

async function runTests() {
  console.log('Starting data sources integration tests...\n');
  
  await testPriceService();
  await testProtocolService();
  await testChainDataService();
  await testDataFetcher();
  
  console.log('\n=== Tests Complete ===');
}

runTests().catch(console.error);

