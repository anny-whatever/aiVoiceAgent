# Troubleshooting Guide

## Common Issues with OpenAI Realtime API Tool Calling

### Server Error: "The server had an error while processing your request"

This is a common issue that can have several causes:

1. **API Key Permissions**

   - Ensure your OpenAI API key has "realtime" permissions enabled
   - Check if your key has "all" permissions instead of restricted ones
   - Verify the key is not expired

2. **Model Issues**

   - The model `gpt-4o-realtime-preview-2024-12-17` may be deprecated
   - Try using a more recent model if available

3. **Tool Configuration Conflicts**
   - Don't define tools in both session creation AND session.update
   - We've moved tool definitions to session.update only

### Debugging Steps

1. **Check Environment Variables**

   ```bash
   # Make sure you have a .env file with:
   OPENAI_API_KEY=your_key_here
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   ```

2. **Test Backend Tool Endpoint**

   ```bash
   curl -X POST http://localhost:3001/api/tools/test
   ```

3. **Check Browser Console**

   - Look for detailed logs starting with 📨, 📞, 🔍, ✅, ❌
   - These will show the exact flow of function calls

4. **Verify Session Creation**
   ```bash
   curl -X POST http://localhost:3001/api/session \
     -H "Content-Type: application/json"
   ```

### Fixed Issues in This Update

1. **Removed duplicate tool definitions** from backend session creation
2. **Added better error logging** throughout the function call flow
3. **Improved tool parameter descriptions** for better model understanding
4. **Enhanced error handling** with more specific error messages

### If Issues Persist

1. Check OpenAI's status page: https://status.openai.com/
2. Contact OpenAI support with your session ID
3. Try a different OpenAI API key with full permissions
4. Check if there are any firewall/network issues blocking the API calls
