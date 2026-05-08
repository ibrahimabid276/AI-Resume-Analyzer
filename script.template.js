// ========================================
// AI Resume Analyzer - Frontend Script (Template)
// ========================================
// IMPORTANT: Copy this file to script.js and replace 'YOUR_OPENROUTER_API_KEY_HERE' 
// with your actual OpenRouter API key in TWO places:
//   1. Line ~178 (startAnalysis function)
//   2. Line ~360 (askQuestion function)
// For production, use a backend proxy to hide API keys
// ========================================

// Global variables to store analysis context
let analysisContext = {
  resumeText: '',
  jobDesc: '',
  result: null
};
