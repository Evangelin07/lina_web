const fs = require('fs');
let content = fs.readFileSync('frontend/script.js', 'utf8');

if (!content.includes('const API_BASE = ')) {
    content = content.replace(
        '// 1. UTILITIES', 
        '// 0. GLOBALS\nconst API_BASE = "http://localhost:5000";\n\n// 1. UTILITIES'
    );
}

// Replace string literals: '/api/
content = content.replace(/'\/api\//g, 'API_BASE + \'/api/');
// Replace template literals: `/api/
content = content.replace(/\`\/api\//g, '\`${API_BASE}/api/');

fs.writeFileSync('frontend/script.js', content, 'utf8');
console.log('Successfully updated script.js fetch calls.');
