# 🚀 Code Modernization Analyzer

An AI-powered web application that analyzes your code and provides comprehensive suggestions for modernization, optimization, and improvement using Google Gemini AI.

## ✨ Features

- **Code Modernization**: Identify outdated patterns and suggest modern alternatives
- **Code Transformation**: Refactor code for better structure and maintainability
- **Architecture Review**: Analyze overall design patterns and architectural improvements
- **Performance Tuning**: Optimize algorithms, memory usage, and resource management
- **Security Analysis**: Identify vulnerabilities and security best practices
- **Document Generation**: Create comprehensive documentation automatically
- **CI/CD Optimization**: Improve build, test, and deployment processes
- **Complexity Reduction**: Simplify complex code and improve readability
- **Report Management**: Generate detailed analysis reports with actionable insights

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **AI**: Google Gemini 1.5 Flash API
- **Styling**: Custom CSS with modern design
- **File Upload**: Multer for handling file uploads
- **Icons**: Lucide React

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd hack_with_legacy_and_modernize
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Get your Gemini API key** (Can be set in the web interface)
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - You can set it directly in the web interface (recommended)
   - Or optionally add it to `.env` file: `cd server && cp env.example .env`

4. **Start the application**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 5001) and frontend (port 3000).

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📖 Usage

### API Key Setup
1. **Web Interface Method (Recommended)**:
   - Open the application in your browser
   - Enter your Gemini API key in the "API Configuration" section
   - Click "Set API Key" to save it
   - The key is stored securely in your browser's localStorage

2. **Environment Variable Method**:
   - Edit `server/.env` file
   - Add: `GEMINI_API_KEY=your_actual_api_key_here`

### Input Methods

1. **File Upload**: Drag and drop or click to upload code files
   - Supports: JS, TS, Python, Java, C++, C#, PHP, Ruby, Go, Rust, Swift, Kotlin

2. **Direct Code Input**: Paste your code directly into the text area

### Analysis Options

- **Analyze All**: Run all analysis types at once for comprehensive results
- **Individual Analysis**: Choose specific analysis types:
  - Code Modernization
  - Code Transformation
  - Architecture Review
  - Performance Tuning
  - Security Analysis
  - Document Generation
  - CI/CD Optimization
  - Complexity Reduction
  - Report Management

### Results

Each analysis provides:
- **Quality Score**: Percentage score (0-100%) for each analysis category
- **Overall Score**: Average score across all categories with visual indicators
- **Detailed Analysis**: Comprehensive suggestions and improvements
- **Code Examples**: Practical examples where applicable
- **Priority Recommendations**: Implementation guidance with priority levels
- **Visual Indicators**: Color-coded scores (🟢 Excellent, 🟡 Good, 🟠 Needs Work, 🔴 Poor)

## 🏗️ Project Structure

```
hack_with_legacy_and_modernize/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main application component
│   │   ├── main.jsx       # React entry point
│   │   └── index.css      # Global styles
│   ├── index.html         # HTML template
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite configuration
├── server/                # Node.js backend
│   ├── index.js           # Express server
│   ├── package.json       # Backend dependencies
│   └── env.example        # Environment variables template
├── package.json           # Root package.json
└── README.md             # This file
```

## 🔧 API Endpoints

- `POST /api/analyze` - Analyze code with specific analysis type
- `POST /api/analyze-all` - Run all analysis types
- `GET /api/analysis-types` - Get available analysis types

## 🎨 Features in Detail

### Scoring System
The application uses an intelligent scoring algorithm that analyzes Gemini's response to calculate quality scores:

- **Base Score**: 50% (neutral starting point)
- **Improvement Indicators**: Keywords like "outdated", "vulnerable", "inefficient" reduce the score
- **Quality Indicators**: Keywords like "modern", "secure", "efficient" increase the score
- **Score Ranges**:
  - 🟢 **80-100%**: Excellent - Minimal improvements needed
  - 🟡 **60-79%**: Good - Some optimizations recommended
  - 🟠 **40-59%**: Needs Work - Significant improvements required
  - 🔴 **0-39%**: Poor - Major refactoring needed

### Code Modernization
- Identifies outdated syntax and patterns
- Suggests modern language features
- Recommends framework/library updates
- Provides best practices implementation

### Code Transformation
- Refactoring opportunities
- Design pattern implementation
- Function decomposition
- Variable naming improvements

### Architecture Review
- Overall design pattern analysis
- Separation of concerns evaluation
- Scalability considerations
- Maintainability assessment

### Performance Tuning
- Algorithm efficiency analysis
- Memory usage optimization
- Database query optimization
- Caching strategies

### Security Analysis
- Input validation issues
- Authentication/authorization flaws
- Data exposure risks
- Injection vulnerabilities

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Environment Variables
Make sure to set these in production:
- `GEMINI_API_KEY`: Your Google Gemini API key
- `PORT`: Server port (default: 5001)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **API Key Error**: Make sure your Gemini API key is correctly set in the web interface or `.env` file
2. **Model Not Found Error**: The application now uses `gemini-1.5-flash` model (updated from `gemini-pro`)
3. **Port Conflicts**: If ports 3000 or 5001 are in use, modify the configuration
4. **File Upload Issues**: Ensure the `uploads/` directory exists in the server folder

### Getting Help

- Check the console for error messages
- Verify your API key is valid
- Ensure all dependencies are installed correctly

## 🔮 Future Enhancements

- Support for more programming languages
- Integration with version control systems
- Batch processing capabilities
- Custom analysis templates
- Export results to various formats
- Integration with popular IDEs

---

**Happy Coding! 🎉**
