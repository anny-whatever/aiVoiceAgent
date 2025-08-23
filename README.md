# 🚗 Drival - Simple Voice Chat Bot

A minimal real-time voice chat bot that answers driving questions using WebRTC and OpenAI's Realtime API.

## ✨ What It Does

- **Real-time voice conversation** - Talk naturally with the AI
- **Simple audio cues** - Ding sounds indicate when to speak (low tone) and when AI responds (high tone)
- **Driving data integration** - AI uses tools to access driving-data.json for accurate information
- **Minimal UI** - Clean, distraction-free interface

## 🚀 Quick Start

1. **Setup environment**:

   ```bash
   cp .env.example .env
   # Add your OPENAI_API_KEY to .env
   ```

2. **Start backend**:

   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Start frontend**:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Open browser** to `http://localhost:5173`

## 🎯 Simplified Architecture

**Frontend (`App.jsx` - 180 lines vs 633 before)**:

- Minimal state management (5 states vs 15+ before)
- Simple WebRTC connection
- Audio cue system for turn-taking
- Clean conversation flow

**Backend (`index.ts` - 150 lines vs 285 before)**:

- Essential endpoints only (session, tools, health)
- Removed extensive logging/debugging
- Streamlined error handling
- Simple data retrieval from driving-data.json

## 🗣️ How to Use

1. Click "Start Voice Chat"
2. Wait for connection (status circle turns blue)
3. Listen for low ding = your turn to speak
4. Ask driving questions like:
   - "What are the speed limits?"
   - "Tell me about defensive driving"
   - "How do I handle a breakdown?"
5. Listen for high ding = AI is speaking
6. Continue conversation naturally

## 🔧 Key Features

- **Server VAD** - Automatically detects when you stop speaking
- **Tool integration** - AI uses `get_driving_data` function to access JSON data
- **Audio cues** - Simple ding sounds for turn management
- **Real-time** - Low latency WebRTC audio streaming
- **Mobile friendly** - Responsive design

## 📊 Data Categories

The bot can answer questions about:

- Traffic rules (speed limits, right of way, parking)
- Safety tips (defensive driving, weather conditions)
- Emergency procedures (breakdowns, accidents)
- Navigation tips (route planning, highway driving)
- Vehicle maintenance (checks, inspections)

## 🎵 Audio Cues

- **600Hz ding** - Your turn to speak
- **1000Hz ding** - AI is about to respond

No complex UI needed - just listen for the cues and talk naturally!


