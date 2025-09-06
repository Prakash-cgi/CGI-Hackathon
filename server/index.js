const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Initialize Gemini AI (will be set per request)
let genAI;

// Function to calculate improvement score based on analysis response
const calculateImprovementScore = (analysisType, response) => {
  const responseLower = response.toLowerCase();
  let score = 50; // Base score
  
  // Keywords that indicate high improvement potential (lower score)
  const highImprovementKeywords = [
    'outdated', 'legacy', 'deprecated', 'old', 'ancient', 'obsolete',
    'security vulnerability', 'vulnerable', 'unsafe', 'risk', 'danger',
    'performance issue', 'slow', 'inefficient', 'bottleneck', 'memory leak',
    'complex', 'complicated', 'hard to read', 'maintainability', 'spaghetti',
    'missing', 'lack of', 'no error handling', 'no validation', 'no documentation',
    'refactor', 'rewrite', 'major changes', 'significant improvement'
  ];
  
  // Keywords that indicate good code (higher score)
  const goodCodeKeywords = [
    'modern', 'best practice', 'well written', 'clean', 'efficient',
    'secure', 'safe', 'good performance', 'optimized', 'maintainable',
    'readable', 'documented', 'error handling', 'validation', 'robust',
    'minimal changes', 'minor improvements', 'already good', 'excellent'
  ];
  
  // Count improvement indicators
  const improvementCount = highImprovementKeywords.filter(keyword => 
    responseLower.includes(keyword)
  ).length;
  
  // Count good code indicators
  const goodCodeCount = goodCodeKeywords.filter(keyword => 
    responseLower.includes(keyword)
  ).length;
  
  // Adjust score based on findings
  score -= improvementCount * 8; // Each improvement indicator reduces score
  score += goodCodeCount * 5; // Each good indicator increases score
  
  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));
  
  // Round to nearest 5 for cleaner display
  return Math.round(score / 5) * 5;
};

// Predefined prompts for different analysis types
const analysisPrompts = {
  modernization: `Analyze the provided code for modernization opportunities. Focus on:
  - Outdated syntax and patterns
  - Modern language features that could be used
  - Framework/library updates
  - Best practices implementation
  Provide specific suggestions with code examples.`,

  transformation: `Transform the provided code to improve its structure and maintainability. Focus on:
  - Code refactoring opportunities
  - Design pattern implementation
  - Function decomposition
  - Variable naming improvements
  - Code organization
  Provide before/after examples with explanations.`,

  architecture: `Review the architecture of the provided code. Analyze:
  - Overall design patterns
  - Separation of concerns
  - Scalability considerations
  - Maintainability issues
  - Architectural improvements
  Provide architectural recommendations with diagrams if applicable.`,

  performance: `Analyze the code for performance optimization opportunities. Focus on:
  - Algorithm efficiency
  - Memory usage optimization
  - Database query optimization
  - Caching strategies
  - Resource management
  Provide specific performance improvements with benchmarks.`,

  security: `Identify security vulnerabilities in the provided code. Look for:
  - Input validation issues
  - Authentication/authorization flaws
  - Data exposure risks
  - Injection vulnerabilities
  - Security best practices violations
  Provide specific fixes and security recommendations.`,

  documentation: `Generate comprehensive documentation for the provided code. Include:
  - Function/class descriptions
  - Parameter documentation
  - Usage examples
  - API documentation
  - README content
  Provide well-structured documentation in markdown format.`,

  cicd: `Analyze the code for CI/CD pipeline improvements. Focus on:
  - Build optimization
  - Testing strategies
  - Deployment automation
  - Quality gates
  - Monitoring and logging
  Provide CI/CD configuration recommendations.`,

  complexity: `Analyze and reduce code complexity. Focus on:
  - Cyclomatic complexity reduction
  - Function length optimization
  - Nested conditionals simplification
  - Code readability improvements
  - Maintainability enhancements
  Provide refactored code with complexity metrics.`,

  reporting: `Generate a comprehensive analysis report covering:
  - Summary of all findings
  - Priority recommendations
  - Implementation roadmap
  - Risk assessment
  - Success metrics
  Provide a structured report with actionable insights.`
};

// Routes
app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    const { code, analysisType, apiKey } = req.body;
    let codeContent = code;

    // Check if API key is provided
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // If file is uploaded, read its content
    if (req.file) {
      const fs = require('fs');
      codeContent = fs.readFileSync(req.file.path, 'utf8');
    }

    if (!codeContent) {
      return res.status(400).json({ error: 'No code provided' });
    }

    const prompt = analysisPrompts[analysisType];
    if (!prompt) {
      return res.status(400).json({ error: 'Invalid analysis type' });
    }

    // Initialize Gemini AI with the provided API key
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const fullPrompt = `${prompt}\n\nCode to analyze:\n\`\`\`\n${codeContent}\n\`\`\``;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const analysisResult = response.text();
    
    // Calculate improvement score
    const score = calculateImprovementScore(analysisType, analysisResult);

    res.json({
      success: true,
      analysisType,
      result: analysisResult,
      score: score,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error.message 
    });
  }
});

app.post('/api/analyze-all', upload.single('file'), async (req, res) => {
  try {
    const { code, apiKey } = req.body;
    let codeContent = code;

    // Check if API key is provided
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // If file is uploaded, read its content
    if (req.file) {
      const fs = require('fs');
      codeContent = fs.readFileSync(req.file.path, 'utf8');
    }

    if (!codeContent) {
      return res.status(400).json({ error: 'No code provided' });
    }

    // Initialize Gemini AI with the provided API key
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const results = {};

    // Run all analyses in parallel
    const analysisPromises = Object.entries(analysisPrompts).map(async ([type, prompt]) => {
      try {
        const fullPrompt = `${prompt}\n\nCode to analyze:\n\`\`\`\n${codeContent}\n\`\`\``;
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const analysisResult = response.text();
        const score = calculateImprovementScore(type, analysisResult);
        return { type, result: analysisResult, score };
      } catch (error) {
        console.error(`Error in ${type} analysis:`, error);
        return { type, result: `Error: ${error.message}`, score: 0 };
      }
    });

    const analysisResults = await Promise.all(analysisPromises);
    
    analysisResults.forEach(({ type, result, score }) => {
      results[type] = { result, score };
    });

    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Full analysis error:', error);
    res.status(500).json({ 
      error: 'Full analysis failed', 
      details: error.message 
    });
  }
});

app.get('/api/analysis-types', (req, res) => {
  const types = Object.keys(analysisPrompts).map(key => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
    description: analysisPrompts[key].split('\n')[0]
  }));
  
  res.json(types);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
