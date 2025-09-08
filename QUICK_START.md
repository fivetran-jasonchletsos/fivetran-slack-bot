# Quick Start Guide

Get your Fivetran Slack Bot running in 5 minutes!

## 🚀 One-Command Setup

```bash
# Clone and setup everything
git clone https://github.com/YOUR_USERNAME/fivetran-slack-bot.git
cd fivetran-slack-bot
npm run setup
```

## 📋 What You Need

1. **Fivetran API Key & Secret** (from Fivetran dashboard)
2. **Slack Bot Token & Signing Secret** (from Slack app)

## ⚡ Quick Setup Steps

### 1. Get Fivetran Credentials
- Go to Fivetran → Account Settings → API Keys
- Create new API key
- Copy API Key and Secret

### 2. Create Slack App
- Go to [api.slack.com/apps](https://api.slack.com/apps)
- Create New App → From an app manifest
- Use `slack-app-manifest.json` (replace `YOUR-PUBLIC-URL`)
- Install to workspace
- Copy Bot Token and Signing Secret

### 3. Configure Environment
```bash
# Edit .env with your credentials
nano .env
```

### 4. Test & Start
```bash
# Validate setup
npm run validate

# Start bot
npm start

# In another terminal (for local dev)
ngrok http 3000
```

## 🧪 Test Commands

Once running, test in Slack:
- `/fivetran-help` - Show help
- `/fivetran-status all` - List connectors
- `/fivetran-sync <connector>` - Trigger sync

## 🔧 Troubleshooting

**"Missing credentials"**
- Check `.env` file has all required variables

**"Slack verification failed"**
- Ensure ngrok URL is HTTPS
- Check Signing Secret is correct

**"No connectors found"**
- Verify Fivetran API credentials
- Check account has connectors

## 📚 Full Documentation

- `SETUP.md` - Complete setup guide
- `docs/DEPLOYMENT.md` - Production deployment
- `README.md` - Project overview

## 🎯 Demo Flow

Perfect for hackathons:
1. "Our data team wastes time switching tools..."
2. `/fivetran-status all` (shows real connector dashboard)
3. `/fivetran-sync salesforce` (triggers actual sync)
4. Show interactive buttons and notifications
5. "Reduces pipeline management time by 80%!"

## 🚀 Production Ready

This bot includes:
- ✅ Comprehensive error handling
- ✅ Health monitoring
- ✅ CI/CD pipeline
- ✅ Security best practices
- ✅ Production deployment guide
- ✅ Complete test suite
