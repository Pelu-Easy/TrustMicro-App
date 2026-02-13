const sqlite3 = require('sqlite3').verbose();
// This creates and connects to your database file
const db = new sqlite3.Database('./trustmicro.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to TrustMicro SQLite Database.');
    }
});

module.exports = db;
