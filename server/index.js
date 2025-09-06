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

// Enhanced function to calculate detailed improvement metrics
const calculateDetailedMetrics = (analysisType, response) => {
  const responseLower = response.toLowerCase();
  let baseScore = 50; // Base score
  
  // Analysis-specific keyword sets
  const analysisKeywords = {
    modernization: {
      negative: ['outdated', 'legacy', 'deprecated', 'old', 'ancient', 'obsolete', 'var', 'function()', 'callback', 'jquery'],
      positive: ['modern', 'es6', 'es2015+', 'async/await', 'arrow functions', 'const/let', 'modules', 'typescript']
    },
    security: {
      negative: ['vulnerable', 'unsafe', 'risk', 'danger', 'injection', 'xss', 'csrf', 'sql injection', 'no validation'],
      positive: ['secure', 'safe', 'validated', 'sanitized', 'encrypted', 'authentication', 'authorization', 'https']
    },
    performance: {
      negative: ['slow', 'inefficient', 'bottleneck', 'memory leak', 'n+1 query', 'blocking', 'synchronous'],
      positive: ['fast', 'efficient', 'optimized', 'cached', 'async', 'parallel', 'streaming', 'lazy loading']
    },
    architecture: {
      negative: ['tightly coupled', 'monolithic', 'spaghetti', 'god object', 'circular dependency'],
      positive: ['modular', 'loosely coupled', 'separation of concerns', 'design patterns', 'clean architecture']
    },
    complexity: {
      negative: ['complex', 'complicated', 'nested', 'cyclomatic', 'hard to read', 'too many parameters'],
      positive: ['simple', 'clean', 'readable', 'single responsibility', 'small functions', 'clear naming']
    },
    documentation: {
      negative: ['no documentation', 'missing comments', 'unclear', 'undocumented', 'no examples'],
      positive: ['well documented', 'clear comments', 'examples', 'api docs', 'readme', 'tutorials']
    },
    cicd: {
      negative: ['manual deployment', 'no tests', 'no ci/cd', 'no automation', 'no monitoring'],
      positive: ['automated', 'ci/cd', 'tests', 'monitoring', 'deployment pipeline', 'quality gates']
    },
    transformation: {
      negative: ['refactor needed', 'rewrite', 'major changes', 'poor structure', 'bad practices'],
      positive: ['well structured', 'good practices', 'clean code', 'minimal changes', 'already good']
    },
    reporting: {
      negative: ['no metrics', 'no monitoring', 'no reporting', 'no analytics', 'no insights'],
      positive: ['comprehensive', 'detailed metrics', 'monitoring', 'analytics', 'insights', 'dashboard']
    }
  };
  
  const keywords = analysisKeywords[analysisType] || analysisKeywords.modernization;
  
  // Count negative and positive indicators
  const negativeCount = keywords.negative.filter(keyword => 
    responseLower.includes(keyword)
  ).length;
  
  const positiveCount = keywords.positive.filter(keyword => 
    responseLower.includes(keyword)
  ).length;
  
  // Calculate base score
  baseScore -= negativeCount * 10; // Each negative indicator reduces score more
  baseScore += positiveCount * 8; // Each positive indicator increases score
  
  // Additional scoring factors
  const hasCodeExamples = responseLower.includes('example') || responseLower.includes('```');
  const hasSpecificRecommendations = responseLower.includes('recommend') || responseLower.includes('suggest');
  const hasMetrics = responseLower.includes('%') || responseLower.includes('improvement') || responseLower.includes('better');
  
  if (hasCodeExamples) baseScore += 5;
  if (hasSpecificRecommendations) baseScore += 5;
  if (hasMetrics) baseScore += 5;
  
  // Ensure score is within bounds
  baseScore = Math.max(0, Math.min(100, baseScore));
  
  // Calculate additional metrics
  const improvementPotential = Math.max(0, 100 - baseScore);
  const codeQuality = baseScore;
  const modernizationLevel = analysisType === 'modernization' ? baseScore : Math.min(100, baseScore + 20);
  
  // Generate detailed breakdown
  const metrics = {
    overallScore: Math.round(baseScore),
    improvementPotential: Math.round(improvementPotential),
    codeQuality: Math.round(codeQuality),
    modernizationLevel: Math.round(modernizationLevel),
    issuesFound: negativeCount,
    improvementsSuggested: positiveCount,
    hasCodeExamples,
    hasSpecificRecommendations,
    hasMetrics,
    analysisType,
    timestamp: new Date().toISOString()
  };
  
  return metrics;
};

// Legacy function for backward compatibility
const calculateImprovementScore = (analysisType, response) => {
  const metrics = calculateDetailedMetrics(analysisType, response);
  return metrics.overallScore;
};

// Mock responses for when API quota is exceeded
const getMockResponse = (analysisType) => {
  const mockResponses = {
    modernization: `## Code Modernization Analysis

### Issues Found:
- **Outdated Syntax**: Using \`var\` instead of \`const\`/`let`
- **Legacy Patterns**: Callback-style functions instead of async/await
- **Old Object Creation**: Using function constructors instead of modern syntax

### Modernization Recommendations:
1. **Replace var with const/let**:
   \`\`\`javascript
   // Old
   var total = 0;
   
   // Modern
   const total = 0;
   \`\`\`

2. **Use Arrow Functions**:
   \`\`\`javascript
   // Old
   function calculateTotal(items) { ... }
   
   // Modern
   const calculateTotal = (items) => { ... }
   \`\`\`

3. **Implement Async/Await**:
   \`\`\`javascript
   // Old
   function fetchData(callback) { ... }
   
   // Modern
   async function fetchData() { ... }
   \`\`\`

### Modernization Score: 35% - Significant improvements needed`,

    security: `## Security Analysis

### Security Issues Found:
- **Input Validation**: Missing validation for user inputs
- **XSS Vulnerabilities**: Direct string concatenation without sanitization
- **No Authentication**: Missing user authentication mechanisms
- **Data Exposure**: Sensitive data not properly protected

### Security Recommendations:
1. **Input Validation**:
   \`\`\`javascript
   // Add input validation
   if (!user.name || typeof user.name !== 'string') {
     throw new Error('Invalid name');
   }
   \`\`\`

2. **XSS Prevention**:
   \`\`\`javascript
   // Sanitize output
   const sanitizedName = DOMPurify.sanitize(user.name);
   \`\`\`

3. **Authentication**:
   \`\`\`javascript
   // Implement JWT authentication
   const token = jwt.sign({ userId: user.id }, secret);
   \`\`\`

### Security Score: 25% - Critical security improvements required`,

    performance: `## Performance Analysis

### Performance Issues:
- **Inefficient Loops**: Using traditional for loops instead of optimized methods
- **Memory Leaks**: Potential memory leaks in callback functions
- **Synchronous Operations**: Blocking operations that could be async
- **No Caching**: Missing caching mechanisms

### Performance Optimizations:
1. **Optimize Loops**:
   \`\`\`javascript
   // Old
   for (var i = 0; i < items.length; i++) {
     total += items[i].price;
   }
   
   // Optimized
   const total = items.reduce((sum, item) => sum + item.price, 0);
   \`\`\`

2. **Implement Caching**:
   \`\`\`javascript
   const cache = new Map();
   if (cache.has(key)) return cache.get(key);
   \`\`\`

3. **Use Async Operations**:
   \`\`\`javascript
   // Use async/await for non-blocking operations
   const result = await fetchData();
   \`\`\`

### Performance Score: 40% - Moderate performance improvements needed`,

    architecture: `## Architecture Review

### Architectural Issues:
- **Tight Coupling**: Functions are tightly coupled to specific implementations
- **No Separation of Concerns**: Business logic mixed with presentation
- **Monolithic Structure**: All code in single functions
- **No Design Patterns**: Missing common design patterns

### Architecture Improvements:
1. **Implement MVC Pattern**:
   \`\`\`javascript
   // Separate concerns
   class UserController {
     async getUser(id) { ... }
   }
   
   class UserService {
     async findUser(id) { ... }
   }
   \`\`\`

2. **Use Dependency Injection**:
   \`\`\`javascript
   class UserService {
     constructor(userRepository) {
       this.userRepository = userRepository;
     }
   }
   \`\`\`

3. **Implement Factory Pattern**:
   \`\`\`javascript
   class UserFactory {
     static createUser(type) { ... }
   }
   \`\`\`

### Architecture Score: 30% - Major architectural refactoring needed`,

    complexity: `## Complexity Analysis

### Complexity Issues:
- **High Cyclomatic Complexity**: Functions with too many branches
- **Long Functions**: Functions exceeding 20 lines
- **Deep Nesting**: Multiple levels of nested conditions
- **Poor Naming**: Unclear variable and function names

### Complexity Reduction:
1. **Extract Functions**:
   \`\`\`javascript
   // Break down complex functions
   function processUser(user) {
     validateUser(user);
     const processedData = transformUser(user);
     return saveUser(processedData);
   }
   \`\`\`

2. **Reduce Nesting**:
   \`\`\`javascript
   // Use early returns
   if (!user) return null;
   if (!user.name) return null;
   // Continue processing...
   \`\`\`

3. **Improve Naming**:
   \`\`\`javascript
   // Clear, descriptive names
   const userTotalAmount = calculateTotal(user.purchases);
   \`\`\`

### Complexity Score: 45% - Moderate complexity reduction needed`,

    documentation: `## Documentation Analysis

### Documentation Issues:
- **Missing Comments**: No inline documentation
- **No API Documentation**: Missing endpoint documentation
- **Unclear Function Purpose**: Functions without descriptions
- **No Usage Examples**: Missing code examples

### Documentation Improvements:
1. **Add JSDoc Comments**:
   \`\`\`javascript
   /**
    * Calculates the total price of items
    * @param {Array} items - Array of items with price property
    * @returns {number} Total price
    */
   function calculateTotal(items) { ... }
   \`\`\`

2. **Create README**:
   \`\`\`markdown
   # User Management System
   
   ## Installation
   npm install
   
   ## Usage
   const user = new User('John');
   \`\`\`

3. **API Documentation**:
   \`\`\`javascript
   // Use Swagger/OpenAPI for API docs
   /**
    * @swagger
    * /api/users:
    *   get:
    *     summary: Get all users
    */
   \`\`\`

### Documentation Score: 20% - Extensive documentation needed`,

    cicd: `## CI/CD Analysis

### CI/CD Issues:
- **No Automated Testing**: Missing test automation
- **Manual Deployment**: No automated deployment pipeline
- **No Code Quality Gates**: Missing quality checks
- **No Monitoring**: No application monitoring

### CI/CD Improvements:
1. **Implement GitHub Actions**:
   \`\`\`yaml
   name: CI/CD Pipeline
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Run tests
           run: npm test
   \`\`\`

2. **Add Quality Gates**:
   \`\`\`yaml
   - name: Code Quality Check
     run: npm run lint
   - name: Security Scan
     run: npm audit
   \`\`\`

3. **Automated Deployment**:
   \`\`\`yaml
   - name: Deploy to Production
     run: npm run deploy
   \`\`\`

### CI/CD Score: 15% - Complete CI/CD setup needed`,

    transformation: `## Code Transformation Analysis

### Transformation Issues:
- **Poor Code Structure**: Code not well organized
- **Inconsistent Patterns**: Mixed coding styles
- **No Error Handling**: Missing error handling mechanisms
- **Hard-coded Values**: Magic numbers and strings

### Transformation Recommendations:
1. **Improve Structure**:
   \`\`\`javascript
   // Organize code into modules
   export class UserManager {
     constructor() { ... }
     async createUser(userData) { ... }
   }
   \`\`\`

2. **Add Error Handling**:
   \`\`\`javascript
   try {
     const result = await processUser(user);
   } catch (error) {
     logger.error('User processing failed:', error);
     throw new UserProcessingError(error.message);
   }
   \`\`\`

3. **Use Constants**:
   \`\`\`javascript
   const MAX_RETRY_ATTEMPTS = 3;
   const DEFAULT_TIMEOUT = 5000;
   \`\`\`

### Transformation Score: 35% - Significant transformation needed`,

    reporting: `## Reporting Analysis

### Reporting Issues:
- **No Metrics Collection**: Missing performance metrics
- **No Analytics**: No user behavior tracking
- **No Error Reporting**: Missing error tracking
- **No Dashboard**: No monitoring dashboard

### Reporting Improvements:
1. **Implement Metrics**:
   \`\`\`javascript
   // Add performance metrics
   const startTime = Date.now();
   await processRequest();
   const duration = Date.now() - startTime;
   metrics.record('request_duration', duration);
   \`\`\`

2. **Error Tracking**:
   \`\`\`javascript
   // Use Sentry for error tracking
   Sentry.captureException(error);
   \`\`\`

3. **Analytics Dashboard**:
   \`\`\`javascript
   // Create monitoring dashboard
   const dashboard = new MonitoringDashboard({
     metrics: ['response_time', 'error_rate', 'throughput']
   });
   \`\`\`

### Reporting Score: 25% - Comprehensive reporting system needed`
  };

  return mockResponses[analysisType] || mockResponses.modernization;
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
    
    // Calculate detailed metrics
    const metrics = calculateDetailedMetrics(analysisType, analysisResult);

    res.json({
      success: true,
      analysisType,
      result: analysisResult,
      score: metrics.overallScore,
      metrics: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    // Check if it's a quota exceeded error
    if (error.message.includes('429') || error.message.includes('quota')) {
      console.log(`Using mock response for ${analysisType} due to API quota exceeded`);
      const mockResult = getMockResponse(analysisType);
      const mockMetrics = calculateDetailedMetrics(analysisType, mockResult);
      
      res.json({
        success: true,
        analysisType,
        result: mockResult,
        score: mockMetrics.overallScore,
        metrics: mockMetrics,
        isMockResponse: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        error: 'Analysis failed', 
        details: error.message 
      });
    }
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
        const metrics = calculateDetailedMetrics(type, analysisResult);
        return { type, result: analysisResult, score: metrics.overallScore, metrics };
      } catch (error) {
        console.error(`Error in ${type} analysis:`, error);
        
        // Check if it's a quota exceeded error
        if (error.message.includes('429') || error.message.includes('quota')) {
          console.log(`Using mock response for ${type} due to API quota exceeded`);
          const mockResult = getMockResponse(type);
          const mockMetrics = calculateDetailedMetrics(type, mockResult);
          return { 
            type, 
            result: mockResult, 
            score: mockMetrics.overallScore, 
            metrics: mockMetrics,
            isMockResponse: true
          };
        }
        
        // For other errors, return error response
        const errorMetrics = {
          overallScore: 0,
          improvementPotential: 100,
          codeQuality: 0,
          modernizationLevel: 0,
          issuesFound: 1,
          improvementsSuggested: 0,
          hasCodeExamples: false,
          hasSpecificRecommendations: false,
          hasMetrics: false,
          analysisType: type,
          timestamp: new Date().toISOString()
        };
        return { type, result: `Error: ${error.message}`, score: 0, metrics: errorMetrics };
      }
    });

    const analysisResults = await Promise.all(analysisPromises);
    
    analysisResults.forEach(({ type, result, score, metrics }) => {
      results[type] = { result, score, metrics };
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
