const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
app.use(express.raw({ type: 'application/x-www-form-urlencoded' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    env_configured: !!(process.env.FIVETRAN_API_KEY)
  });
});

// Slack webhook handler
app.post('/slack/events', async (req, res) => {
  res.status(200).send();
  
  try {
    const params = new URLSearchParams(req.body.toString('utf8'));
    const command = params.get('command');
    const text = params.get('text') || '';
    const response_url = params.get('response_url');
    
    if (!response_url) return;
    
    let responseText = '';
    
    if (!process.env.FIVETRAN_API_KEY || !process.env.FIVETRAN_API_SECRET) {
      responseText = '⚠️ Fivetran credentials not configured. Add environment variables in Cloud Run.';
    } else {
      if (command === '/fivetran-status') {
        responseText = await getStatus(text);
      } else if (command === '/fivetran-sync') {
        responseText = await triggerSync(text);
      } else {
        responseText = 'Bot is running! Use /fivetran-status or /fivetran-sync';
      }
    }
    
    await axios.post(response_url, {
      text: responseText,
      response_type: 'ephemeral'
    }).catch(err => console.error('Failed to respond to Slack:', err.message));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
});

async function getStatus(filter) {
  try {
    const auth = Buffer.from(`${process.env.FIVETRAN_API_KEY}:${process.env.FIVETRAN_API_SECRET}`).toString('base64');
    const response = await axios.get('https://api.fivetran.com/v1/connectors', {
      headers: { 'Authorization': `Basic ${auth}` },
      timeout: 10000
    });
    
    let connectors = response.data.data.items || [];
    let description = `all ${connectors.length}`;
    
    // Apply filter if specified
    if (filter) {
      if (filter.startsWith('filter:')) {
        const prefix = filter.replace('filter:', '').trim();
        connectors = connectors.filter(c => c.schema.startsWith(prefix));
        description = `with prefix "${prefix}"`;
      } else if (filter === 'mine' || filter === 'jason') {
        connectors = connectors.filter(c => c.schema.startsWith('jason_'));
        description = 'your';
      }
    }
    
    if (connectors.length === 0) {
      return `No connectors found ${description}`;
    }
    
    let text = `📊 *Found ${connectors.length} connector(s)* ${description}:\n\n`;
    connectors.slice(0, 10).forEach(c => {
      text += `• *${c.schema}* - ${c.service}\n`;
    });
    
    if (connectors.length > 10) {
      text += `\n... and ${connectors.length - 10} more`;
    }
    
    return text;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function triggerSync(connectorName) {
  if (!connectorName) {
    return '❌ Please specify a connector name\n\nUsage: `/fivetran-sync connector-name`\n\nTip: Use `/fivetran-status` to see available connectors';
  }
  
  try {
    const auth = Buffer.from(`${process.env.FIVETRAN_API_KEY}:${process.env.FIVETRAN_API_SECRET}`).toString('base64');
    
    const response = await axios.get('https://api.fivetran.com/v1/connectors', {
      headers: { 'Authorization': `Basic ${auth}` },
      timeout: 10000
    });
    
    const connectors = response.data.data.items || [];
    
    // First try exact match
    let matches = connectors.filter(c => 
      c.schema.toLowerCase() === connectorName.toLowerCase()
    );
    
    // If no exact match, try partial match
    if (matches.length === 0) {
      matches = connectors.filter(c => 
        c.schema.toLowerCase().includes(connectorName.toLowerCase())
      );
    }
    
    if (matches.length === 0) {
      return `❌ No connector found matching "${connectorName}"`;
    }
    
    if (matches.length > 1) {
      // If multiple matches, prioritize ones starting with "jason_"
      const jasonMatches = matches.filter(c => c.schema.startsWith('jason_'));
      if (jasonMatches.length === 1) {
        matches = jasonMatches;
      } else {
        let text = `⚠️ Multiple matches found. Please be more specific:\n\n`;
        matches.slice(0, 5).forEach(c => {
          text += `• ${c.schema}\n`;
        });
        if (matches.length > 5) {
          text += `... and ${matches.length - 5} more\n`;
        }
        text += '\n💡 Tip: Use more of the connector name or the full name';
        return text;
      }
    }
    
    // Trigger sync
    const connector = matches[0];
    await axios.post(`https://api.fivetran.com/v1/connectors/${connector.id}/sync`, {}, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    
    return `✅ *Sync triggered successfully!*\n\n*Connector:* ${connector.schema}\n*Service:* ${connector.service}`;
    
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
