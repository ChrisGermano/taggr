const fs = require('fs');
let configPath = './config.json';
let configParsed = JSON.parse(fs.readFileSync(configPath, 'UTF-8'));
exports.storedConfig = configParsed;
