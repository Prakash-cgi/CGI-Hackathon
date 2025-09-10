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

// Function to detect if input code is already modern
const detectModernCode = (code) => {
  if (!code) return false;
  
  const modernIndicators = [
    'const ', 'let ', '=>', 'async ', 'await ', 'import ', 'export ',
    'class ', 'extends ', 'constructor', 'get ', 'set ',
    'Promise', 'fetch', 'async/await', 'template literals',
    'destructuring', 'spread operator', 'arrow functions'
  ];
  
  const legacyIndicators = [
    'var ', 'function(', 'callback', 'jQuery', '$(',
    'document.getElementById', 'innerHTML', 'eval(',
    'with(', 'arguments.callee'
  ];
  
  const modernCount = modernIndicators.filter(indicator => 
    code.includes(indicator)
  ).length;
  
  const legacyCount = legacyIndicators.filter(indicator => 
    code.includes(indicator)
  ).length;
  
  return modernCount > legacyCount && modernCount >= 3;
};


// Enhanced function to calculate detailed improvement metrics
const calculateDetailedMetrics = (analysisType, response, inputCode = '') => {
  const responseLower = response.toLowerCase();
  const isModernInput = detectModernCode(inputCode);
  let baseScore = isModernInput ? 75 : 50; // Higher base score for modern input
  
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
  
  // Calculate base score with different penalties for modern vs legacy code
  if (isModernInput) {
    // For modern code, be more lenient with negative indicators
    baseScore -= negativeCount * 5; // Reduced penalty for modern code
    baseScore += positiveCount * 10; // Higher reward for positive indicators
  } else {
    // For legacy code, use original scoring
    baseScore -= negativeCount * 10;
    baseScore += positiveCount * 8;
  }
  
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
const calculateImprovementScore = (analysisType, response, inputCode = '') => {
  const metrics = calculateDetailedMetrics(analysisType, response, inputCode);
  return metrics.overallScore;
};

// Enhanced mock responses that adapt to actual code content
const getEnhancedMockResponse = (analysisType, inputCode = '') => {
  const isModernInput = detectModernCode(inputCode);
  const codeLength = inputCode.length;
  const hasComments = inputCode.includes('//') || inputCode.includes('/*');
  const hasFunctions = inputCode.includes('function') || inputCode.includes('=>');
  const hasClasses = inputCode.includes('class ');
  const hasAsync = inputCode.includes('async') || inputCode.includes('await');
  const hasImports = inputCode.includes('import') || inputCode.includes('require');
  const hasVar = inputCode.includes('var ');
  const hasConst = inputCode.includes('const ');
  const hasLet = inputCode.includes('let ');
  const hasArrowFunctions = inputCode.includes('=>');
  const hasTemplateLiterals = inputCode.includes('`');
  const hasDestructuring = inputCode.includes('{') && inputCode.includes('}') && inputCode.includes('=');
  const hasPromises = inputCode.includes('Promise') || inputCode.includes('.then(');
  const hasTryCatch = inputCode.includes('try') && inputCode.includes('catch');
  const hasConsoleLog = inputCode.includes('console.log');
  const hasJSDoc = inputCode.includes('/**') || inputCode.includes('@param') || inputCode.includes('@returns');
  
  // Extract specific code patterns for analysis
  const lines = inputCode.split('\n').filter(line => line.trim().length > 0);
  const functionCount = (inputCode.match(/function\s+\w+/g) || []).length + (inputCode.match(/\w+\s*=>/g) || []).length;
  const variableCount = (inputCode.match(/var\s+\w+/g) || []).length + (inputCode.match(/let\s+\w+/g) || []).length + (inputCode.match(/const\s+\w+/g) || []).length;
  
  // Generate dynamic score based on code characteristics
  let dynamicScore = 30; // Start lower for more realistic scoring
  if (isModernInput) dynamicScore += 30;
  if (hasComments) dynamicScore += 8;
  if (hasFunctions) dynamicScore += 5;
  if (hasClasses) dynamicScore += 10;
  if (hasAsync) dynamicScore += 12;
  if (hasImports) dynamicScore += 8;
  if (hasConst) dynamicScore += 5;
  if (hasLet) dynamicScore += 3;
  if (hasArrowFunctions) dynamicScore += 5;
  if (hasTemplateLiterals) dynamicScore += 3;
  if (hasDestructuring) dynamicScore += 4;
  if (hasPromises) dynamicScore += 6;
  if (hasTryCatch) dynamicScore += 8;
  if (hasJSDoc) dynamicScore += 10;
  if (codeLength > 200) dynamicScore += 3;
  if (codeLength > 500) dynamicScore += 2;
  if (functionCount > 2) dynamicScore += 3;
  if (variableCount > 5) dynamicScore += 2;
  
  // Penalties for legacy patterns
  if (hasVar) dynamicScore -= 8;
  if (hasConsoleLog) dynamicScore -= 2;
  if (codeLength < 50) dynamicScore -= 5;
  
  dynamicScore = Math.min(95, Math.max(15, dynamicScore));
  
  const mockResponses = {
    modernization: isModernInput ? `## Code Modernization Analysis

### Code Quality Assessment:
✅ **Modern JavaScript Patterns**: Your code demonstrates contemporary JavaScript practices
${hasConst ? '✅ **Block Scoping**: Proper use of \`const\` for immutable values' : ''}
${hasLet ? '✅ **Block Scoping**: Appropriate use of \`let\` for mutable variables' : ''}
${hasArrowFunctions ? '✅ **Arrow Functions**: Modern function syntax for cleaner code' : ''}
${hasAsync ? '✅ **Async/Await**: Modern asynchronous programming patterns' : ''}
${hasTemplateLiterals ? '✅ **Template Literals**: Modern string interpolation' : ''}
${hasDestructuring ? '✅ **Destructuring**: Modern object/array destructuring patterns' : ''}
${hasImports ? '✅ **ES6 Modules**: Modern import/export syntax' : ''}
${hasClasses ? '✅ **ES6 Classes**: Modern object-oriented programming' : ''}
${hasTryCatch ? '✅ **Error Handling**: Proper exception handling' : ''}
${hasJSDoc ? '✅ **Documentation**: Well-documented code with JSDoc' : ''}

### Code Statistics:
- **Lines of Code**: ${lines.length} lines
- **Functions**: ${functionCount} functions
- **Variables**: ${variableCount} variables
- **Code Length**: ${codeLength} characters

### Enhancement Opportunities:
${!hasJSDoc ? '1. **Add JSDoc Documentation**: Improve code documentation for better maintainability\n' : ''}
${!hasTryCatch ? '2. **Add Error Handling**: Implement comprehensive error handling\n' : ''}
${!hasImports ? '3. **Consider ES6 Modules**: Use import/export for better code organization\n' : ''}
4. **Consider TypeScript**: For enhanced type safety and developer experience

### Modernization Score: ${dynamicScore}% - ${dynamicScore >= 80 ? 'Excellent modern code!' : dynamicScore >= 60 ? 'Good modern practices!' : 'Needs some modernization'}` : `## Code Modernization Analysis

### Issues Found in Your Code:
${hasVar ? '❌ **Legacy Variable Declaration**: Using \`var\` instead of \`const\`/\`let\`\n' : ''}
${!hasConst && !hasLet ? '❌ **Missing Block Scoping**: No use of \`const\` or \`let\`\n' : ''}
${!hasArrowFunctions ? '❌ **Legacy Functions**: Using function declarations instead of arrow functions\n' : ''}
${!hasAsync ? '❌ **Callback Patterns**: No modern async/await usage\n' : ''}
${!hasTemplateLiterals ? '❌ **String Concatenation**: Using old string concatenation methods\n' : ''}
${!hasDestructuring ? '❌ **Manual Property Access**: Not using destructuring patterns\n' : ''}
${!hasImports ? '❌ **No Module System**: Missing ES6 import/export syntax\n' : ''}
${!hasClasses ? '❌ **No Classes**: Missing modern OOP patterns\n' : ''}
${!hasTryCatch ? '❌ **No Error Handling**: Missing exception handling\n' : ''}
${!hasComments ? '❌ **No Documentation**: Code lacks comments and documentation\n' : ''}

### Code Statistics:
- **Lines of Code**: ${lines.length} lines
- **Functions**: ${functionCount} functions  
- **Variables**: ${variableCount} variables
- **Code Length**: ${codeLength} characters

### Modernization Recommendations:

#### 🔄 **Variable Declarations**
\`\`\`javascript
// ❌ Legacy Code
var total = 0;
var items = [];
var isLoaded = false;

// ✅ Modern Code
const total = 0;
const items = [];
let isLoaded = false;
\`\`\`

#### 🔄 **Function Declarations**
\`\`\`javascript
// ❌ Legacy Code
function calculateTotal(items) {
  var sum = 0;
  for (var i = 0; i < items.length; i++) {
    sum += items[i].price;
  }
  return sum;
}

// ✅ Modern Code
const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};
\`\`\`

#### 🔄 **Async Operations**
\`\`\`javascript
// ❌ Legacy Code
function fetchData(callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      callback(xhr.responseText);
    }
  };
  xhr.open('GET', '/api/data');
  xhr.send();
}

// ✅ Modern Code
const fetchData = async () => {
  try {
    const response = await fetch('/api/data');
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};
\`\`\`

#### 🔄 **Object and Array Handling**
\`\`\`javascript
// ❌ Legacy Code
var user = {
  name: 'John',
  age: 30
};
var name = user.name;
var age = user.age;

// ✅ Modern Code
const user = {
  name: 'John',
  age: 30
};
const { name, age } = user;
\`\`\`

#### 🔄 **String Interpolation**
\`\`\`javascript
// ❌ Legacy Code
var message = 'Hello ' + name + ', you are ' + age + ' years old';

// ✅ Modern Code
const message = \`Hello \${name}, you are \${age} years old\`;
\`\`\`

### Modernization Score: ${dynamicScore}% - ${dynamicScore >= 80 ? 'Excellent modern code!' : dynamicScore >= 60 ? 'Good modern practices!' : 'Significant improvement potential!'}`,

    transformation: `## Code Transformation Analysis

### Current State Assessment:
${isModernInput ? '✅ **Good Foundation**: Code shows modern patterns' : '⚠️ **Legacy Code**: Needs significant transformation'}
${hasComments ? '✅ **Documentation**: Code is well-documented' : '⚠️ **Missing Documentation**: Add comments for better maintainability'}
${hasFunctions ? '✅ **Modular Design**: Functions are properly defined' : '⚠️ **Monolithic Code**: Consider breaking into smaller functions'}

### Code Statistics:
- **Lines of Code**: ${lines.length} lines
- **Functions**: ${functionCount} functions
- **Variables**: ${variableCount} variables
- **Transformation Level**: ${codeLength > 500 ? 'High' : codeLength > 200 ? 'Medium' : 'Low'}

### Transformation Examples:

#### 🔄 **Function Refactoring**
\`\`\`javascript
// ❌ Legacy Code - Monolithic Function
function processUserData(userData) {
  var result = {};
  if (userData.name) {
    result.name = userData.name.toUpperCase();
  }
  if (userData.email) {
    result.email = userData.email.toLowerCase();
  }
  if (userData.age) {
    result.age = parseInt(userData.age);
  }
  if (userData.phone) {
    result.phone = userData.phone.replace(/[^0-9]/g, '');
  }
  return result;
}

// ✅ Modern Code - Modular Functions
const sanitizeName = (name) => name?.toUpperCase();
const sanitizeEmail = (email) => email?.toLowerCase();
const sanitizeAge = (age) => parseInt(age);
const sanitizePhone = (phone) => phone?.replace(/[^0-9]/g, '');

const processUserData = (userData) => {
  return {
    name: sanitizeName(userData.name),
    email: sanitizeEmail(userData.email),
    age: sanitizeAge(userData.age),
    phone: sanitizePhone(userData.phone)
  };
};
\`\`\`

#### 🔄 **Error Handling**
\`\`\`javascript
// ❌ Legacy Code - No Error Handling
function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

// ✅ Modern Code - Comprehensive Error Handling
const calculateTotal = (items) => {
  try {
    if (!Array.isArray(items)) {
      throw new Error('Items must be an array');
    }
    
    return items.reduce((total, item) => {
      if (typeof item.price !== 'number') {
        throw new Error('Item price must be a number');
      }
      return total + item.price;
    }, 0);
  } catch (error) {
    console.error('Error calculating total:', error);
    throw error;
  }
};
\`\`\`

#### 🔄 **Code Organization**
\`\`\`javascript
// ❌ Legacy Code - Inline Logic
var users = [];
for (var i = 0; i < data.length; i++) {
  if (data[i].active) {
    users.push({
      id: data[i].id,
      name: data[i].name,
      email: data[i].email
    });
  }
}

// ✅ Modern Code - Functional Approach
const isActiveUser = (user) => user.active;
const mapToUserObject = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email
});

const users = data
  .filter(isActiveUser)
  .map(mapToUserObject);
\`\`\`

### Transformation Score: ${dynamicScore}% - ${dynamicScore >= 80 ? 'Excellent transformation!' : dynamicScore >= 60 ? 'Good transformation practices!' : 'Needs significant transformation'}`,

    architecture: `## Architecture Analysis

### Design Pattern Assessment:
${hasClasses ? '✅ **Object-Oriented Design**: Proper use of classes and inheritance' : '⚠️ **Procedural Code**: Consider object-oriented patterns'}
${hasImports ? '✅ **Modular Architecture**: Good use of imports/exports' : '⚠️ **Monolithic Structure**: Consider modular design'}
${hasAsync ? '✅ **Asynchronous Design**: Proper async/await implementation' : '⚠️ **Synchronous Code**: Consider async patterns for better performance'}

### Code Statistics:
- **Lines of Code**: ${lines.length} lines
- **Functions**: ${functionCount} functions
- **Variables**: ${variableCount} variables
- **Architecture Level**: ${hasClasses && hasImports ? 'Advanced' : hasImports ? 'Intermediate' : 'Basic'}

### Architecture Examples:

#### 🔄 **Modular Design**
\`\`\`javascript
// ❌ Legacy Code - Monolithic Structure
var userService = {
  users: [],
  addUser: function(user) {
    this.users.push(user);
  },
  getUser: function(id) {
    for (var i = 0; i < this.users.length; i++) {
      if (this.users[i].id === id) {
        return this.users[i];
      }
    }
  }
};

// ✅ Modern Code - Modular Architecture
// userService.js
export class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }
  
  async addUser(user) {
    return await this.userRepository.save(user);
  }
  
  async getUser(id) {
    return await this.userRepository.findById(id);
  }
}
\`\`\`

#### 🔄 **Design Patterns**
\`\`\`javascript
// ❌ Legacy Code - No Design Patterns
function createUser(name, email) {
  var user = {
    name: name,
    email: email,
    createdAt: new Date()
  };
  return user;
}

// ✅ Modern Code - Factory Pattern
class UserFactory {
  static createUser(type, name, email) {
    switch (type) {
      case 'admin':
        return new AdminUser(name, email);
      case 'regular':
        return new RegularUser(name, email);
      default:
        throw new Error('Invalid user type');
    }
  }
}

class BaseUser {
  constructor(name, email) {
    this.name = name;
    this.email = email;
    this.createdAt = new Date();
  }
}
\`\`\`

### Architecture Score: ${dynamicScore}% - ${dynamicScore >= 80 ? 'Excellent architecture!' : dynamicScore >= 60 ? 'Good architectural practices!' : 'Needs architectural improvements'}`,

    performance: `## Performance Analysis

### Performance Assessment:
${hasAsync ? '✅ **Asynchronous Operations**: Good async/await patterns for non-blocking code' : '⚠️ **Synchronous Code**: Consider async patterns for I/O operations'}
${hasPromises ? '✅ **Promise Handling**: Proper promise-based programming' : '⚠️ **No Promises**: Consider promise-based patterns'}
${hasTryCatch ? '✅ **Error Handling**: Proper exception handling prevents crashes' : '⚠️ **No Error Handling**: Add try-catch blocks'}
${hasFunctions ? '✅ **Modular Functions**: Good separation for performance optimization' : '⚠️ **Monolithic Code**: Consider breaking into smaller functions'}
${hasImports ? '✅ **ES6 Modules**: Tree-shaking friendly for smaller bundles' : '⚠️ **No Modules**: Consider ES6 modules for better bundling'}
${hasConsoleLog ? '⚠️ **Debug Code**: Remove console.log statements for production' : '✅ **Clean Code**: No debug statements'}

### Code Performance Metrics:
- **Lines of Code**: ${lines.length} lines
- **Function Count**: ${functionCount} functions
- **Variable Count**: ${variableCount} variables
- **Code Complexity**: ${codeLength > 500 ? 'High' : codeLength > 200 ? 'Medium' : 'Low'}

### Performance Examples:

#### 🔄 **Async Operations**
\`\`\`javascript
// ❌ Legacy Code - Blocking Operations
function fetchUserData(userId) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/users/' + userId, false); // Synchronous!
  xhr.send();
  return JSON.parse(xhr.responseText);
}

function fetchUserPosts(userId) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/users/' + userId + '/posts', false); // Synchronous!
  xhr.send();
  return JSON.parse(xhr.responseText);
}

// ✅ Modern Code - Non-blocking Operations
const fetchUserData = async (userId) => {
  const response = await fetch(\`/api/users/\${userId}\`);
  return await response.json();
};

const fetchUserPosts = async (userId) => {
  const response = await fetch(\`/api/users/\${userId}/posts\`);
  return await response.json();
};

// Parallel execution
const fetchUserProfile = async (userId) => {
  const [userData, userPosts] = await Promise.all([
    fetchUserData(userId),
    fetchUserPosts(userId)
  ]);
  return { userData, userPosts };
};
\`\`\`

#### 🔄 **Loop Optimization**
\`\`\`javascript
// ❌ Legacy Code - Inefficient Loops
function processItems(items) {
  var result = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].active) {
      result.push({
        id: items[i].id,
        name: items[i].name.toUpperCase(),
        price: items[i].price * 1.1
      });
    }
  }
  return result;
}

// ✅ Modern Code - Optimized Processing
const processItems = (items) => {
  return items
    .filter(item => item.active)
    .map(item => ({
      id: item.id,
      name: item.name.toUpperCase(),
      price: item.price * 1.1
    }));
};
\`\`\`

#### 🔄 **Memory Management**
\`\`\`javascript
// ❌ Legacy Code - Memory Leaks
var cache = {};
function getData(key) {
  if (cache[key]) {
    return cache[key];
  }
  var data = expensiveOperation(key);
  cache[key] = data;
  return data;
}

// ✅ Modern Code - Proper Memory Management
class DataCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  get(key) {
    if (this.cache.has(key)) {
      // Move to end (LRU)
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
\`\`\`

### Performance Recommendations:
${!hasAsync ? '1. **Add Async/Await**: Use async patterns for I/O operations\n' : ''}
${!hasPromises ? '2. **Use Promises**: Implement promise-based error handling\n' : ''}
${!hasTryCatch ? '3. **Add Error Handling**: Implement try-catch blocks\n' : ''}
${hasConsoleLog ? '4. **Remove Debug Code**: Remove console.log statements\n' : ''}
5. **Optimize Loops**: Use efficient loop patterns and avoid nested loops
6. **Memory Management**: Avoid memory leaks and optimize variable usage

### Performance Score: ${dynamicScore}% - ${dynamicScore >= 80 ? 'Excellent performance practices!' : dynamicScore >= 60 ? 'Good performance patterns!' : 'Needs performance optimization'}`,

    security: `## Security Analysis

### Security Assessment:
${hasTryCatch ? '✅ **Error Handling**: Proper exception handling prevents information leakage' : '⚠️ **No Error Handling**: Add try-catch blocks to prevent crashes'}
${hasComments ? '✅ **Code Documentation**: Good for security review and audit' : '⚠️ **Missing Documentation**: Harder to audit for security issues'}
${hasFunctions ? '✅ **Modular Code**: Easier to audit and secure individual functions' : '⚠️ **Monolithic Code**: Harder to secure and audit'}
${hasImports ? '✅ **ES6 Modules**: Better dependency management and security' : '⚠️ **No Modules**: Consider modularization for better security'}
${hasConsoleLog ? '⚠️ **Debug Information**: Remove console.log statements that might leak sensitive data' : '✅ **Clean Code**: No debug statements that could leak information'}
${inputCode.includes('eval') ? '❌ **Dangerous Functions**: Avoid eval() usage - major security risk!' : '✅ **Safe Functions**: No dangerous function calls'}
${inputCode.includes('innerHTML') ? '⚠️ **DOM Manipulation**: Be careful with innerHTML - potential XSS risk' : '✅ **Safe DOM Usage**: No dangerous DOM manipulation'}

### Code Security Metrics:
- **Lines of Code**: ${lines.length} lines
- **Function Count**: ${functionCount} functions
- **Variable Count**: ${variableCount} variables
- **Security Risk Level**: ${codeLength > 500 ? 'High' : codeLength > 200 ? 'Medium' : 'Low'}

### Security Examples:

#### 🔄 **Input Validation**
\`\`\`javascript
// ❌ Legacy Code - No Input Validation
function processUserInput(userData) {
  var sql = "INSERT INTO users (name, email) VALUES ('" + 
            userData.name + "', '" + userData.email + "')";
  database.execute(sql);
}

// ✅ Modern Code - Proper Input Validation
const processUserInput = async (userData) => {
  // Input validation
  if (!userData.name || typeof userData.name !== 'string') {
    throw new Error('Invalid name');
  }
  
  if (!userData.email || !isValidEmail(userData.email)) {
    throw new Error('Invalid email');
  }
  
  // Sanitize input
  const sanitizedData = {
    name: sanitizeString(userData.name),
    email: userData.email.toLowerCase().trim()
  };
  
  // Use parameterized queries
  const sql = "INSERT INTO users (name, email) VALUES (?, ?)";
  await database.execute(sql, [sanitizedData.name, sanitizedData.email]);
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
};

const sanitizeString = (str) => {
  return str.replace(/[<>\"']/g, '');
};
\`\`\`

#### 🔄 **Error Handling**
\`\`\`javascript
// ❌ Legacy Code - Exposing Sensitive Information
function authenticateUser(username, password) {
  var user = database.findUser(username);
  if (user.password === password) {
    return user;
  } else {
    throw new Error("User " + username + " authentication failed");
  }
}

// ✅ Modern Code - Secure Error Handling
const authenticateUser = async (username, password) => {
  try {
    const user = await database.findUser(username);
    
    if (!user) {
      throw new Error('Authentication failed');
    }
    
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    
    if (!isValidPassword) {
      throw new Error('Authentication failed');
    }
    
    return {
      id: user.id,
      username: user.username,
      role: user.role
      // Never return password or sensitive data
    };
  } catch (error) {
    // Log error securely without exposing sensitive info
    logger.error('Authentication error', { username, error: error.message });
    throw new Error('Authentication failed');
  }
};
\`\`\`

#### 🔄 **Safe DOM Manipulation**
\`\`\`javascript
// ❌ Legacy Code - XSS Vulnerable
function displayUserMessage(message) {
  document.getElementById('message').innerHTML = message;
}

// ✅ Modern Code - XSS Safe
const displayUserMessage = (message) => {
  const messageElement = document.getElementById('message');
  
  // Sanitize input
  const sanitizedMessage = sanitizeHTML(message);
  
  // Use textContent instead of innerHTML
  messageElement.textContent = sanitizedMessage;
  
  // Or use a proper HTML sanitizer
  // messageElement.innerHTML = DOMPurify.sanitize(message);
};

const sanitizeHTML = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};
\`\`\`

### Security Recommendations:
${!hasTryCatch ? '1. **Add Error Handling**: Implement try-catch blocks to prevent information leakage\n' : ''}
${hasConsoleLog ? '2. **Remove Debug Code**: Remove console.log statements that might expose sensitive data\n' : ''}
${!hasImports ? '3. **Use ES6 Modules**: Implement proper module system for better security\n' : ''}
4. **Input Validation**: Implement proper input sanitization
5. **Avoid eval()**: Never use eval() with user input
6. **HTTPS Only**: Ensure all communications use HTTPS
7. **Dependency Management**: Keep dependencies updated and audit for vulnerabilities

### Security Score: ${dynamicScore}% - ${dynamicScore >= 80 ? 'Excellent security practices!' : dynamicScore >= 60 ? 'Good security patterns!' : 'Needs security improvements'}`,

    documentation: `## Documentation Analysis

### Documentation Assessment:
${hasComments ? '✅ **Code Comments**: Good inline documentation present' : '❌ **Missing Comments**: No inline documentation found'}
${hasJSDoc ? '✅ **JSDoc Documentation**: Professional documentation with JSDoc comments' : '⚠️ **Missing JSDoc**: Add JSDoc comments for functions and classes'}
${hasFunctions ? '⚠️ **Function Documentation**: ${functionCount} functions need proper documentation' : '✅ **Simple Code**: No complex functions requiring documentation'}
${codeLength > 100 ? '⚠️ **Complex Code**: ${lines.length} lines of code need comprehensive documentation' : '✅ **Simple Code**: Self-documenting code'}

### Code Documentation Metrics:
- **Lines of Code**: ${lines.length} lines
- **Functions**: ${functionCount} functions
- **Variables**: ${variableCount} variables
- **Documentation Coverage**: ${hasComments ? hasJSDoc ? 'Excellent' : 'Good' : 'Poor'}

### Documentation Examples:

#### 🔄 **Function Documentation**
\`\`\`javascript
// ❌ Legacy Code - No Documentation
function calculateTotal(items, tax, discount) {
  var subtotal = 0;
  for (var i = 0; i < items.length; i++) {
    subtotal += items[i].price;
  }
  var total = subtotal + (subtotal * tax) - discount;
  return total;
}

// ✅ Modern Code - Comprehensive JSDoc
/**
 * Calculates the total price including tax and discount
 * @param {Array<{price: number}>} items - Array of items with price property
 * @param {number} tax - Tax rate as decimal (e.g., 0.08 for 8%)
 * @param {number} discount - Discount amount to subtract
 * @returns {number} Final total price
 * @throws {Error} When items array is empty or tax is negative
 * @example
 * const items = [{price: 10}, {price: 20}];
 * const total = calculateTotal(items, 0.08, 5); // Returns 27.4
 */
const calculateTotal = (items, tax, discount) => {
  if (!items || items.length === 0) {
    throw new Error('Items array cannot be empty');
  }
  
  if (tax < 0) {
    throw new Error('Tax rate cannot be negative');
  }
  
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const total = subtotal + (subtotal * tax) - discount;
  return total;
};
\`\`\`

#### 🔄 **Class Documentation**
\`\`\`javascript
// ❌ Legacy Code - No Class Documentation
function User(name, email) {
  this.name = name;
  this.email = email;
  this.createdAt = new Date();
}

User.prototype.getInfo = function() {
  return this.name + ' (' + this.email + ')';
};

// ✅ Modern Code - Well-Documented Class
/**
 * Represents a user in the system
 * @class User
 * @example
 * const user = new User('John Doe', 'john@example.com');
 * console.log(user.getInfo()); // "John Doe (john@example.com)"
 */
class User {
  /**
   * Creates an instance of User
   * @param {string} name - User's full name
   * @param {string} email - User's email address
   * @throws {Error} When name or email is invalid
   */
  constructor(name, email) {
    if (!name || typeof name !== 'string') {
      throw new Error('Name must be a non-empty string');
    }
    
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Email must be a valid email address');
    }
    
    this.name = name;
    this.email = email;
    this.createdAt = new Date();
  }
  
  /**
   * Gets user information as a formatted string
   * @returns {string} Formatted user information
   */
  getInfo() {
    return \`\${this.name} (\${this.email})\`;
  }
  
  /**
   * Validates email format
   * @private
   * @param {string} email - Email to validate
   * @returns {boolean} True if email is valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  }
}
\`\`\`

#### 🔄 **API Documentation**
\`\`\`javascript
// ❌ Legacy Code - No API Documentation
app.post('/api/users', function(req, res) {
  var userData = req.body;
  var user = new User(userData.name, userData.email);
  database.save(user);
  res.json({success: true});
});

// ✅ Modern Code - Comprehensive API Documentation
/**
 * @api {post} /api/users Create User
 * @apiName CreateUser
 * @apiGroup Users
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} name User's full name
 * @apiParam {String} email User's email address
 * 
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {String} message Success message
 * @apiSuccess {Object} user Created user object
 * 
 * @apiError {String} error Error message
 * @apiError {Number} status HTTP status code
 * 
 * @apiExample {json} Request:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com"
 * }
 * 
 * @apiExample {json} Success Response:
 * {
 *   "success": true,
 *   "message": "User created successfully",
 *   "user": {
 *     "id": 1,
 *     "name": "John Doe",
 *     "email": "john@example.com"
 *   }
 * }
 */
app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    // Validation
    if (!name || !email) {
      return res.status(400).json({
        error: 'Name and email are required'
      });
    }
    
    const user = new User(name, email);
    await database.save(user);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: user
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create user'
    });
  }
});
\`\`\`

### Documentation Recommendations:
${!hasComments ? '1. **Add Code Comments**: Add inline comments explaining complex logic\n' : ''}
${!hasJSDoc ? '2. **Add JSDoc Comments**: Document all functions and classes with JSDoc\n' : ''}
${functionCount > 0 ? '3. **Function Documentation**: Document all ${functionCount} functions with parameters and return types\n' : ''}
4. **README File**: Create comprehensive README documentation
5. **API Documentation**: Document all public APIs and interfaces
6. **Code Examples**: Add usage examples for complex functions

### Documentation Score: ${dynamicScore}% - ${dynamicScore >= 80 ? 'Excellent documentation!' : dynamicScore >= 60 ? 'Good documentation practices!' : 'Needs documentation improvements'}`,

    cicd: `## CI/CD Analysis

### CI/CD Assessment:
${hasImports ? '✅ **Modular Code**: Good ES6 module structure for CI/CD pipelines' : '⚠️ **Monolithic Code**: Consider modularization for better CI/CD'}
${hasFunctions ? '✅ **Testable Code**: ${functionCount} functions can be easily unit tested' : '⚠️ **Hard to Test**: Consider refactoring for testability'}
${hasClasses ? '✅ **Object-Oriented**: Good class structure for testing and CI/CD' : '⚠️ **Procedural Code**: Consider OOP for better CI/CD practices'}
${hasTryCatch ? '✅ **Error Handling**: Proper error handling for CI/CD reliability' : '⚠️ **No Error Handling**: Add error handling for CI/CD stability'}
${codeLength > 200 ? '⚠️ **Large Codebase**: ${lines.length} lines - consider splitting into smaller modules' : '✅ **Manageable Size**: Good size for CI/CD processes'}

### Code CI/CD Metrics:
- **Lines of Code**: ${lines.length} lines
- **Functions**: ${functionCount} functions
- **Variables**: ${variableCount} variables
- **Modularity**: ${hasImports ? 'Good' : 'Needs improvement'}
- **Testability**: ${hasFunctions ? 'Good' : 'Needs improvement'}

### CI/CD Examples:

#### 🔄 **Testing Structure**
\`\`\`javascript
// ❌ Legacy Code - No Testing Structure
function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

// ✅ Modern Code - Testable Structure
// calculateTotal.js
export const calculateTotal = (items) => {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }
  
  return items.reduce((total, item) => {
    if (typeof item.price !== 'number') {
      throw new Error('Item price must be a number');
    }
    return total + item.price;
  }, 0);
};

// calculateTotal.test.js
import { calculateTotal } from './calculateTotal.js';
import { describe, it, expect } from 'vitest';

describe('calculateTotal', () => {
  it('should calculate total for valid items', () => {
    const items = [{ price: 10 }, { price: 20 }];
    expect(calculateTotal(items)).toBe(30);
  });
  
  it('should throw error for invalid input', () => {
    expect(() => calculateTotal('invalid')).toThrow('Items must be an array');
  });
});
\`\`\`

#### 🔄 **Package Management**
\`\`\`json
// ❌ Legacy Code - No Package Management
// No package.json file
// Dependencies managed manually
// No version control for dependencies

// ✅ Modern Code - Proper Package Management
// package.json
{
  "name": "my-project",
  "version": "1.0.0",
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "build": "vite build",
    "deploy": "npm run build && npm run test"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "vitest": "^0.34.0",
    "eslint": "^8.45.0",
    "vite": "^4.4.0"
  }
}

// package-lock.json (auto-generated)
// Ensures reproducible builds
\`\`\`

#### 🔄 **CI/CD Pipeline**
\`\`\`yaml
# ❌ Legacy Code - No CI/CD Pipeline
# Manual deployment
# No automated testing
# No code quality checks

# ✅ Modern Code - GitHub Actions CI/CD
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Run linting
        run: npm run lint
      
      - name: Build project
        run: npm run build
      
      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: npm run deploy:staging
      
      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: npm run deploy:production
\`\`\`

### CI/CD Recommendations:
${!hasImports ? '1. **Add ES6 Modules**: Implement import/export for better CI/CD pipeline structure\n' : ''}
${!hasFunctions ? '2. **Add Functions**: Break code into testable functions\n' : ''}
${!hasTryCatch ? '3. **Add Error Handling**: Implement error handling for CI/CD reliability\n' : ''}
4. **Automated Testing**: Implement unit and integration tests for all functions
5. **Code Quality Gates**: Add linting, code quality checks, and security scanning
6. **Deployment Automation**: Implement automated deployment pipelines
7. **Dependency Management**: Use package.json and lock files for reproducible builds

### CI/CD Score: ${dynamicScore}% - ${dynamicScore >= 80 ? 'Excellent CI/CD practices!' : dynamicScore >= 60 ? 'Good CI/CD foundation!' : 'Needs CI/CD improvements'}`,

    complexity: `## Complexity Analysis

### Complexity Assessment:
${hasFunctions ? '✅ **Modular Design**: Good function separation with ${functionCount} functions' : '⚠️ **Monolithic Code**: High complexity - no function separation'}
${hasClasses ? '✅ **Object-Oriented**: Good abstraction with class-based design' : '⚠️ **Procedural Code**: Consider OOP for better complexity management'}
${hasImports ? '✅ **Modular Structure**: Good separation of concerns with ES6 modules' : '⚠️ **No Modules**: Consider modularization to reduce complexity'}
${hasTryCatch ? '✅ **Error Handling**: Proper error handling reduces complexity' : '⚠️ **No Error Handling**: Add error handling to manage complexity'}
${codeLength > 200 ? '⚠️ **Large Codebase**: ${lines.length} lines - consider breaking down into smaller modules' : '✅ **Concise Code**: Good complexity management'}

### Code Complexity Metrics:
- **Lines of Code**: ${lines.length} lines
- **Functions**: ${functionCount} functions
- **Variables**: ${variableCount} variables
- **Complexity Level**: ${codeLength > 500 ? 'High' : codeLength > 200 ? 'Medium' : 'Low'}
- **Modularity**: ${hasFunctions ? hasImports ? 'Excellent' : 'Good' : 'Poor'}

### Complexity Examples:

#### 🔄 **Function Decomposition**
\`\`\`javascript
// ❌ Legacy Code - Monolithic Function
function processOrder(orderData) {
  var total = 0;
  for (var i = 0; i < orderData.items.length; i++) {
    var item = orderData.items[i];
    if (item.quantity > 0) {
      var price = item.price;
      if (item.discount) {
        price = price * (1 - item.discount);
      }
      if (orderData.customer.type === 'vip') {
        price = price * 0.9;
      }
      total += price * item.quantity;
    }
  }
  
  var tax = total * 0.08;
  var shipping = 0;
  if (total < 50) {
    shipping = 10;
  } else if (total < 100) {
    shipping = 5;
  }
  
  var finalTotal = total + tax + shipping;
  
  if (orderData.paymentMethod === 'credit') {
    // Process credit card
    var result = processCreditCard(orderData.creditCard, finalTotal);
    if (result.success) {
      sendConfirmationEmail(orderData.customer.email, orderData);
      updateInventory(orderData.items);
      return { success: true, total: finalTotal };
    } else {
      return { success: false, error: result.error };
    }
  } else {
    // Process cash
    sendConfirmationEmail(orderData.customer.email, orderData);
    updateInventory(orderData.items);
    return { success: true, total: finalTotal };
  }
}

// ✅ Modern Code - Decomposed Functions
const calculateItemPrice = (item, customerType) => {
  let price = item.price;
  
  if (item.discount) {
    price *= (1 - item.discount);
  }
  
  if (customerType === 'vip') {
    price *= 0.9;
  }
  
  return price * item.quantity;
};

const calculateSubtotal = (items, customerType) => {
  return items
    .filter(item => item.quantity > 0)
    .reduce((total, item) => total + calculateItemPrice(item, customerType), 0);
};

const calculateTax = (subtotal) => subtotal * 0.08;

const calculateShipping = (subtotal) => {
  if (subtotal < 50) return 10;
  if (subtotal < 100) return 5;
  return 0;
};

const processOrder = async (orderData) => {
  try {
    const subtotal = calculateSubtotal(orderData.items, orderData.customer.type);
    const tax = calculateTax(subtotal);
    const shipping = calculateShipping(subtotal);
    const finalTotal = subtotal + tax + shipping;
    
    const paymentResult = await processPayment(orderData.paymentMethod, orderData, finalTotal);
    
    if (paymentResult.success) {
      await Promise.all([
        sendConfirmationEmail(orderData.customer.email, orderData),
        updateInventory(orderData.items)
      ]);
      
      return { success: true, total: finalTotal };
    }
    
    return paymentResult;
  } catch (error) {
    return { success: false, error: error.message };
  }
};
\`\`\`

#### 🔄 **Conditional Logic Simplification**
\`\`\`javascript
// ❌ Legacy Code - Complex Nested Conditions
function getUserStatus(user) {
  if (user.isActive) {
    if (user.subscription) {
      if (user.subscription.type === 'premium') {
        if (user.subscription.expiresAt > new Date()) {
          if (user.paymentMethod) {
            if (user.paymentMethod.isValid) {
              return 'premium-active';
            } else {
              return 'premium-payment-issue';
            }
          } else {
            return 'premium-no-payment';
          }
        } else {
          return 'premium-expired';
        }
      } else if (user.subscription.type === 'basic') {
        if (user.subscription.expiresAt > new Date()) {
          return 'basic-active';
        } else {
          return 'basic-expired';
        }
      }
    } else {
      return 'no-subscription';
    }
  } else {
    return 'inactive';
  }
}

// ✅ Modern Code - Simplified Logic
const getUserStatus = (user) => {
  if (!user.isActive) return 'inactive';
  if (!user.subscription) return 'no-subscription';
  
  const isExpired = user.subscription.expiresAt <= new Date();
  const hasValidPayment = user.paymentMethod?.isValid;
  
  const statusMap = {
    premium: isExpired ? 'premium-expired' : 
             hasValidPayment ? 'premium-active' : 'premium-payment-issue',
    basic: isExpired ? 'basic-expired' : 'basic-active'
  };
  
  return statusMap[user.subscription.type] || 'unknown';
};
\`\`\`

#### 🔄 **Design Pattern Implementation**
\`\`\`javascript
// ❌ Legacy Code - No Design Patterns
function createNotification(type, message, user) {
  if (type === 'email') {
    var emailService = new EmailService();
    emailService.send(user.email, message);
  } else if (type === 'sms') {
    var smsService = new SMSService();
    smsService.send(user.phone, message);
  } else if (type === 'push') {
    var pushService = new PushService();
    pushService.send(user.deviceToken, message);
  }
}

// ✅ Modern Code - Strategy Pattern
class NotificationStrategy {
  send(user, message) {
    throw new Error('Method must be implemented');
  }
}

class EmailNotification extends NotificationStrategy {
  send(user, message) {
    return emailService.send(user.email, message);
  }
}

class SMSNotification extends NotificationStrategy {
  send(user, message) {
    return smsService.send(user.phone, message);
  }
}

class PushNotification extends NotificationStrategy {
  send(user, message) {
    return pushService.send(user.deviceToken, message);
  }
}

class NotificationFactory {
  static create(type) {
    const strategies = {
      email: new EmailNotification(),
      sms: new SMSNotification(),
      push: new PushNotification()
    };
    
    return strategies[type] || new EmailNotification();
  }
}

const createNotification = (type, message, user) => {
  const strategy = NotificationFactory.create(type);
  return strategy.send(user, message);
};
\`\`\`

### Complexity Recommendations:
${!hasFunctions ? '1. **Add Functions**: Break code into smaller, manageable functions\n' : ''}
${!hasImports ? '2. **Add ES6 Modules**: Implement import/export to separate concerns\n' : ''}
${!hasTryCatch ? '3. **Add Error Handling**: Implement try-catch blocks to manage error complexity\n' : ''}
4. **Reduce Cyclomatic Complexity**: Break down complex conditional logic
5. **Single Responsibility**: Each function should have one clear purpose
6. **Avoid Deep Nesting**: Limit nesting levels to 3-4 levels maximum
7. **Use Design Patterns**: Implement appropriate design patterns for complex logic

### Complexity Score: ${dynamicScore}% - ${dynamicScore >= 80 ? 'Excellent complexity management!' : dynamicScore >= 60 ? 'Good complexity practices!' : 'Needs complexity reduction'}`,

    reporting: `## Comprehensive Analysis Report

### Overall Assessment:
**Code Quality**: ${dynamicScore}%
**Modernization Level**: ${isModernInput ? 'Modern' : 'Legacy'}
**Maintainability**: ${hasComments ? hasJSDoc ? 'Excellent' : 'Good' : 'Needs Improvement'}
**Code Size**: ${lines.length} lines, ${functionCount} functions, ${variableCount} variables

### Key Findings:
${hasFunctions ? '✅ **Function Structure**: ${functionCount} functions are well-structured' : '⚠️ **No Functions**: Consider adding functions for better organization'}
${hasComments ? '✅ **Documentation**: Good inline documentation present' : '⚠️ **Missing Documentation**: Add comments and documentation'}
${hasJSDoc ? '✅ **Professional Documentation**: JSDoc comments present' : '⚠️ **Missing JSDoc**: Add JSDoc for professional documentation'}
${hasImports ? '✅ **Modular Design**: Good ES6 module structure' : '⚠️ **No Modules**: Consider implementing ES6 modules'}
${hasTryCatch ? '✅ **Error Handling**: Proper exception handling' : '⚠️ **No Error Handling**: Add try-catch blocks'}
${hasAsync ? '✅ **Async Patterns**: Modern async/await usage' : '⚠️ **No Async**: Consider async patterns for I/O operations'}
${codeLength > 200 ? '⚠️ **Large Codebase**: ${lines.length} lines - consider modularization' : '✅ **Manageable Size**: Good code size for maintenance'}

### Code Statistics:
- **Total Lines**: ${lines.length} lines
- **Functions**: ${functionCount} functions
- **Variables**: ${variableCount} variables
- **Code Length**: ${codeLength} characters
- **Modern Features**: ${[hasConst, hasLet, hasArrowFunctions, hasAsync, hasTemplateLiterals, hasDestructuring, hasImports, hasClasses].filter(Boolean).length}/8

### Recommendations:
${!hasFunctions ? '1. **Add Functions**: Break code into smaller, manageable functions\n' : ''}
${!hasComments ? '2. **Add Documentation**: Add inline comments and documentation\n' : ''}
${!hasJSDoc ? '3. **Add JSDoc**: Implement professional JSDoc documentation\n' : ''}
${!hasImports ? '4. **Add ES6 Modules**: Implement import/export for better organization\n' : ''}
${!hasTryCatch ? '5. **Add Error Handling**: Implement try-catch blocks for reliability\n' : ''}
6. **Code Structure**: Improve overall code organization and maintainability
7. **Testing**: Implement automated testing for all functions
8. **Performance**: Optimize code for better performance and efficiency

### Overall Score: ${dynamicScore}% - ${dynamicScore >= 80 ? 'Excellent code quality!' : dynamicScore >= 60 ? 'Good code practices!' : 'Needs significant improvements'}`
  };
  
  return mockResponses[analysisType] || mockResponses.modernization;
};

// Original mock responses for backward compatibility
const getMockResponse = (analysisType, inputCode = '') => {
  const isModernInput = detectModernCode(inputCode);
  const mockResponses = {
    modernization: isModernInput ? `## Code Modernization Analysis

### Code Quality Assessment:
✅ **Excellent Modern Practices**: Your code demonstrates modern JavaScript patterns
✅ **ES6+ Features**: Proper use of const/let, arrow functions, and modern syntax
✅ **Async/Await**: Modern asynchronous programming patterns implemented
✅ **Clean Structure**: Well-organized and readable code

### Minor Enhancement Opportunities:
1. **Consider TypeScript**: For even better type safety and developer experience
2. **Add JSDoc Comments**: For better code documentation
3. **Error Handling**: Ensure comprehensive error handling throughout

### Modernization Score: 85% - Already well-modernized code!` : `## Code Modernization Analysis

### Issues Found:
- **Outdated Syntax**: Using \`var\` instead of \`const\`/\`let\`
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
  const { code, analysisType, apiKey } = req.body;
  
  try {
    let codeContent = code;

    // Check if API key is provided
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Demo mode - use enhanced mock responses for demo key
    if (apiKey === 'demo-key-for-hackathon') {
      const mockResponse = getEnhancedMockResponse(analysisType, codeContent);
      const metrics = calculateDetailedMetrics(analysisType, mockResponse, codeContent);
      
      return res.json({
        analysis: mockResponse,
        score: metrics.overallScore,
        metrics: metrics,
        demoMode: true
      });
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    console.log('🚀 Using Gemini Model: gemini-2.5-flash-lite');

    const fullPrompt = `${prompt}\n\nCode to analyze:\n\`\`\`\n${codeContent}\n\`\`\``;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const analysisResult = response.text();
    
    // Calculate detailed metrics
    const metrics = calculateDetailedMetrics(analysisType, analysisResult, codeContent);

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
    
    // Check for specific API key errors
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('INVALID_API_KEY') || error.message.includes('401')) {
      res.status(400).json({ 
        error: 'Invalid API Key', 
        details: 'Your Google Gemini API key is invalid or expired. Please check your API key at Google AI Studio and try again.',
        helpUrl: 'https://makersuite.google.com/app/apikey'
      });
      return;
    }
    
    // Check if it's a quota exceeded error
    if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('QUOTA_EXCEEDED')) {
      res.status(429).json({ 
        error: 'API Quota Exceeded', 
        details: 'Your Google Gemini API quota has been exceeded. Please try again later or upgrade your API plan.',
        helpUrl: 'https://makersuite.google.com/app/apikey'
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

    // Demo mode - use enhanced mock responses for demo key
    if (apiKey === 'demo-key-for-hackathon') {
      const results = {};
      const analysisTypes = Object.keys(analysisPrompts);
      
      for (const type of analysisTypes) {
        const mockResponse = getEnhancedMockResponse(type, codeContent);
        const metrics = calculateDetailedMetrics(type, mockResponse, codeContent);
        results[type] = {
          result: mockResponse,
          score: metrics.overallScore,
          metrics: metrics
        };
      }
      
      return res.json({
        results: results,
        demoMode: true
      });
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    console.log('🚀 Using Gemini Model: gemini-2.5-flash-lite');
    const results = {};

    // Run all analyses in parallel
    const analysisPromises = Object.entries(analysisPrompts).map(async ([type, prompt]) => {
      try {
        const fullPrompt = `${prompt}\n\nCode to analyze:\n\`\`\`\n${codeContent}\n\`\`\``;
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const analysisResult = response.text();
        const metrics = calculateDetailedMetrics(type, analysisResult, codeContent);
        return { type, result: analysisResult, score: metrics.overallScore, metrics };
      } catch (error) {
        console.error(`Error in ${type} analysis:`, error);
    
    // Check for specific API key errors
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('INVALID_API_KEY') || error.message.includes('401')) {
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
      return { 
        type, 
        result: `❌ **Invalid API Key Error**\n\nYour Google Gemini API key is invalid or expired. Please:\n1. Check your API key at [Google AI Studio](https://makersuite.google.com/app/apikey)\n2. Generate a new API key if needed\n3. Make sure the key has proper permissions\n\n**Error Details:** ${error.message}`, 
        score: 0, 
        metrics: errorMetrics 
      };
    }
        
        // Check if it's a quota exceeded error
    if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('QUOTA_EXCEEDED')) {
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
          return { 
            type, 
        result: `❌ **API Quota Exceeded**\n\nYour Google Gemini API quota has been exceeded. Please try again later or upgrade your API plan.\n\n**Error Details:** ${error.message}`, 
        score: 0, 
        metrics: errorMetrics 
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
    return { type, result: `❌ **Analysis Error**\n\nAn error occurred during analysis: ${error.message}`, score: 0, metrics: errorMetrics };
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
