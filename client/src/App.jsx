import React, { useState, useEffect } from 'react';
import { Upload, Code, FileText, Zap, Shield, GitBranch, BarChart3, Settings, FileCheck } from 'lucide-react';
import axios from 'axios';

const analysisTypes = [
  { id: 'modernization', name: 'Code Modernization', icon: Zap, color: '#667eea' },
  { id: 'transformation', name: 'Code Transformation', icon: Code, color: '#764ba2' },
  { id: 'architecture', name: 'Architecture Review', icon: Settings, color: '#f093fb' },
  { id: 'performance', name: 'Performance Tuning', icon: BarChart3, color: '#4facfe' },
  { id: 'security', name: 'Security Analysis', icon: Shield, color: '#43e97b' },
  { id: 'documentation', name: 'Document Generation', icon: FileText, color: '#fa709a' },
  { id: 'cicd', name: 'CI/CD Optimization', icon: GitBranch, color: '#ffecd2' },
  { id: 'complexity', name: 'Complexity Reduction', icon: BarChart3, color: '#a8edea' },
  { id: 'reporting', name: 'Report Management', icon: FileCheck, color: '#d299c2' }
];

function App() {
  const [code, setCode] = useState(`// Sample JavaScript Code for Analysis
function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total = total + items[i].price;
  }
  return total;
}

function processUserData(user) {
  if (user != null) {
    if (user.name != null) {
      console.log("User name: " + user.name);
    }
    if (user.email != null) {
      console.log("User email: " + user.email);
    }
  }
}

// Legacy callback-style function
function fetchData(callback) {
  setTimeout(function() {
    callback(null, { data: "some data" });
  }, 1000);
}

// Old-style object creation
var user = {
  name: "John",
  age: 30,
  getInfo: function() {
    return this.name + " is " + this.age + " years old";
  }
};`);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeySet, setApiKeySet] = useState(false);

  // Check for existing API key on component mount
  useEffect(() => {
    const existingApiKey = localStorage.getItem('gemini_api_key');
    if (existingApiKey) {
      setApiKeySet(true);
    }
  }, []);

  const handleFileUpload = (file) => {
    setSelectedFile(file);
    setCode(''); // Clear code input when file is selected
  };

  const handleSetApiKey = () => {
    if (apiKey.trim()) {
      setApiKeySet(true);
      localStorage.setItem('gemini_api_key', apiKey);
    }
  };

  const handleClearApiKey = () => {
    setApiKey('');
    setApiKeySet(false);
    localStorage.removeItem('gemini_api_key');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const analyzeCode = async (analysisType = null) => {
    if (!code && !selectedFile) {
      setError('Please provide code or upload a file');
      return;
    }

    if (!apiKeySet && !localStorage.getItem('gemini_api_key')) {
      setError('Please set your Gemini API key first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      if (code) {
        formData.append('code', code);
      }
      
      // Add API key to the request
      const currentApiKey = apiKeySet ? apiKey : localStorage.getItem('gemini_api_key');
      formData.append('apiKey', currentApiKey);

      let response;
      if (analysisType) {
        formData.append('analysisType', analysisType);
        response = await axios.post('/api/analyze', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setResults({ [analysisType]: { result: response.data.result, score: response.data.score } });
      } else {
        response = await axios.post('/api/analyze-all', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setResults(response.data.results);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAll = () => {
    setCode('');
    setSelectedFile(null);
    setResults(null);
    setError(null);
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🚀 Code Modernization Analyzer</h1>
        <p>AI-powered code analysis and modernization suggestions</p>
        <p style={{fontSize: '1rem', opacity: 0.8, marginTop: '10px'}}>
          ✨ Sample code is pre-loaded below - try "Analyze All" to see the magic!
        </p>
      </div>

      {/* API Key Configuration */}
      <div className="card">
        <h2>🔑 API Configuration</h2>
        {!apiKeySet && !localStorage.getItem('gemini_api_key') ? (
          <div className="form-group">
            <label>Google Gemini API Key</label>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key..."
                style={{flex: 1}}
              />
              <button 
                className="btn" 
                onClick={handleSetApiKey}
                disabled={!apiKey.trim()}
              >
                Set API Key
              </button>
            </div>
            <p style={{fontSize: '0.9rem', color: '#666', marginTop: '8px'}}>
              Get your free API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{color: '#667eea'}}>Google AI Studio</a>
            </p>
          </div>
        ) : (
          <div style={{display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #667eea'}}>
            <span style={{color: '#667eea', fontWeight: '600'}}>✅ API Key Configured</span>
            <button 
              className="btn btn-secondary" 
              onClick={handleClearApiKey}
              style={{padding: '6px 12px', fontSize: '14px'}}
            >
              Change API Key
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>📝 Input Your Code</h2>
        
        {/* File Upload Area */}
        <div className="form-group">
          <label>Upload File (Optional)</label>
          <div 
            className={`file-upload ${dragActive ? 'dragover' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.swift,.kt"
              onChange={handleFileInput}
            />
            <Upload size={48} color="#667eea" />
            <div className="file-upload-text">
              {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
            </div>
            <div className="file-upload-subtext">
              Supports: JS, TS, Python, Java, C++, C#, PHP, Ruby, Go, Rust, Swift, Kotlin
            </div>
          </div>
        </div>

        {/* Code Input */}
        <div className="form-group">
          <label>Or Paste Code Directly (Sample code provided below)</label>
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setSelectedFile(null); // Clear file when typing code
            }}
            placeholder="Paste your code here or modify the sample code above..."
            disabled={!!selectedFile}
          />
        </div>

        {/* Action Buttons */}
        <div className="btn-group">
          <button 
            className="btn" 
            onClick={() => analyzeCode()}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <div className="spinner"></div>
                Analyzing All...
              </>
            ) : (
              <>
                <Zap size={20} />
                Analyze All
              </>
            )}
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={clearAll}
            disabled={isAnalyzing}
          >
            Clear All
          </button>
        </div>

        {/* Individual Analysis Buttons */}
        <div style={{ marginTop: '20px' }}>
          <h3>Or analyze specific aspects:</h3>
          <div className="analysis-grid">
            {analysisTypes.map(({ id, name, icon: Icon, color }) => (
              <div key={id} className="analysis-card">
                <Icon size={24} color={color} />
                <h4>{name}</h4>
                <button 
                  className="btn" 
                  onClick={() => analyzeCode(id)}
                  disabled={isAnalyzing}
                  style={{ 
                    background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                    marginTop: '10px',
                    padding: '8px 16px',
                    fontSize: '14px'
                  }}
                >
                  Analyze {name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="results">
          <h2>📊 Analysis Results</h2>
          
          {/* Overall Score Summary */}
          {(() => {
            const scores = Object.values(results).map(data => 
              typeof data === 'string' ? 50 : data.score
            );
            const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            const overallScoreInfo = (() => {
              if (averageScore >= 80) return { color: '#4CAF50', label: 'Excellent', emoji: '🟢' };
              if (averageScore >= 60) return { color: '#8BC34A', label: 'Good', emoji: '🟡' };
              if (averageScore >= 40) return { color: '#FF9800', label: 'Needs Work', emoji: '🟠' };
              return { color: '#F44336', label: 'Poor', emoji: '🔴' };
            })();
            
            return (
              <div style={{
                background: `linear-gradient(135deg, ${overallScoreInfo.color}20 0%, ${overallScoreInfo.color}10 100%)`,
                border: `2px solid ${overallScoreInfo.color}40`,
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '30px',
                textAlign: 'center'
              }}>
                <h3 style={{margin: '0 0 15px 0', color: '#333'}}>Overall Code Quality Score</h3>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px'}}>
                  <span style={{fontSize: '2rem'}}>{overallScoreInfo.emoji}</span>
                  <div>
                    <div style={{fontSize: '3rem', fontWeight: 'bold', color: overallScoreInfo.color, lineHeight: 1}}>
                      {averageScore}%
                    </div>
                    <div style={{fontSize: '1.2rem', color: overallScoreInfo.color, fontWeight: '600'}}>
                      {overallScoreInfo.label}
                    </div>
                  </div>
                </div>
                <p style={{margin: '15px 0 0 0', color: '#666', fontSize: '0.9rem'}}>
                  Based on {Object.keys(results).length} analysis categories
                </p>
              </div>
            );
          })()}
          {Object.entries(results).map(([type, data]) => {
            const analysisType = analysisTypes.find(t => t.id === type);
            const result = typeof data === 'string' ? data : data.result;
            const score = typeof data === 'string' ? 50 : data.score;
            
            // Determine score color and label
            const getScoreInfo = (score) => {
              if (score >= 80) return { color: '#4CAF50', label: 'Excellent', emoji: '🟢' };
              if (score >= 60) return { color: '#8BC34A', label: 'Good', emoji: '🟡' };
              if (score >= 40) return { color: '#FF9800', label: 'Needs Work', emoji: '🟠' };
              return { color: '#F44336', label: 'Poor', emoji: '🔴' };
            };
            
            const scoreInfo = getScoreInfo(score);
            
            return (
              <div key={type} className="result-section">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <h3 style={{margin: 0}}>
                    {analysisType && <analysisType.icon size={24} color={analysisType.color} />}
                    {' '}{analysisType?.name || type}
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    background: `${scoreInfo.color}20`,
                    border: `2px solid ${scoreInfo.color}40`
                  }}>
                    <span style={{fontSize: '1.2rem'}}>{scoreInfo.emoji}</span>
                    <div style={{textAlign: 'center'}}>
                      <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: scoreInfo.color}}>
                        {score}%
                      </div>
                      <div style={{fontSize: '0.8rem', color: scoreInfo.color, fontWeight: '600'}}>
                        {scoreInfo.label}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="result-content">{result}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default App;
