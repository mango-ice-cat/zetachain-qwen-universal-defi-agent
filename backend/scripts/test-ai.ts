
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testAI() {
  console.log('Starting Test Script...');
  try {
    console.log('Importing AI Strategist...');
    const { aiStrategist } = await import('../src/services/aiStrategist');
    console.log('AI Strategist Imported.');

    console.log('API Key present:', !!process.env.DASHSCOPE_API_KEY);
    
    const input = "I want high yield on Solana";
    console.log(`Sending input: "${input}"`);
    
    // Add a timeout race
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI Request Timed Out after 10s')), 10000)
    );

    const result = await Promise.race([
      aiStrategist.parseIntent(input),
      timeoutPromise
    ]) as any;

    console.log('----------------------------------------');
    console.log('AI Response Success!');
    console.log('Goal:', result.goal);
    console.log('Message:', result.message);
    console.log('----------------------------------------');
  } catch (error) {
    console.error('AI Test Failed:', error);
  }
}

testAI();
