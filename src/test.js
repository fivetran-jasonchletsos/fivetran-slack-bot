'use strict';

require('dotenv').config();
const { createFivetranClient, listConnectors, getConnector } = require('./fivetran');

async function testFivetranConnection() {
  console.log('🔍 Testing Fivetran API connection...\n');

  try {
    // Test 1: Create client
    console.log('1. Creating Fivetran client...');
    const client = createFivetranClient();
    console.log('✅ Client created successfully');

    // Test 2: List connectors
    console.log('\n2. Fetching connector list...');
    const connectorsData = await listConnectors({ limit: 5 }, client);
    
    if (connectorsData && connectorsData.data && connectorsData.data.items) {
      const connectors = connectorsData.data.items;
      console.log(`✅ Found ${connectors.length} connectors (showing first 5)`);
      
      console.log('\n📋 Connector Summary:');
      connectors.forEach((connector, index) => {
        const status = connector.status || {};
        const syncState = status.sync_state || status.setup_state || 'unknown';
        console.log(`${index + 1}. ${connector.schema || connector.service || connector.id}`);
        console.log(`   ID: ${connector.id}`);
        console.log(`   State: ${syncState}`);
        console.log(`   Service: ${connector.service || 'n/a'}`);
        console.log('');
      });

      // Test 3: Get details for first connector
      if (connectors.length > 0) {
        const firstConnector = connectors[0];
        console.log(`3. Fetching details for connector: ${firstConnector.id}...`);
        const details = await getConnector(firstConnector.id, client);
        console.log('✅ Connector details fetched successfully');
        console.log(`   Schema: ${details.data.schema || 'n/a'}`);
        console.log(`   Service: ${details.data.service || 'n/a'}`);
        console.log(`   Status: ${JSON.stringify(details.data.status, null, 2)}`);
      }
    } else {
      console.log('⚠️  No connectors found or unexpected response format');
      console.log('Response:', JSON.stringify(connectorsData, null, 2));
    }

  } catch (error) {
    console.error('❌ Error testing Fivetran connection:');
    console.error('Message:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    
    console.error('\n💡 Troubleshooting tips:');
    console.error('- Check FIVETRAN_API_KEY and FIVETRAN_API_SECRET are set correctly');
    console.error('- Verify your Fivetran account has API access enabled');
    console.error('- Ensure the API credentials have the necessary permissions');
  }
}

async function testSlackConfig() {
  console.log('\n🔍 Testing Slack configuration...\n');

  const requiredVars = ['SLACK_SIGNING_SECRET', 'SLACK_BOT_TOKEN'];
  const optionalVars = ['SLACK_SOCKET_MODE', 'SLACK_APP_TOKEN'];

  console.log('Required environment variables:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value.trim()) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${varName}: Missing`);
    }
  });

  console.log('\nOptional environment variables:');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value.trim()) {
      console.log(`✅ ${varName}: ${value}`);
    } else {
      console.log(`⚠️  ${varName}: Not set`);
    }
  });

  const socketMode = (process.env.SLACK_SOCKET_MODE || '').toString().toLowerCase();
  if (socketMode === '1' || socketMode === 'true') {
    if (!process.env.SLACK_APP_TOKEN) {
      console.log('\n❌ SLACK_APP_TOKEN is required when SLACK_SOCKET_MODE is enabled');
    } else {
      console.log('\n✅ Socket mode configuration looks good');
    }
  }
}

async function main() {
  console.log('🚀 Fivetran Slack Bot - Configuration Test\n');
  console.log('=' .repeat(50));

  await testSlackConfig();
  await testFivetranConnection();

  console.log('\n' + '=' .repeat(50));
  console.log('✨ Test completed!');
  console.log('\nNext steps:');
  console.log('1. If all tests pass, run: npm start');
  console.log('2. If using ngrok: ngrok http 3000');
  console.log('3. Update your Slack app with the public URL');
  console.log('4. Test slash commands in Slack: /fivetran-help');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testFivetranConnection, testSlackConfig };
