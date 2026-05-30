const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./trustmicro.db');

console.log("--- TRUSTMICRO DATABASE CHECK ---");

db.all("SELECT id, full_name, email, role, is_supervisor FROM users", [], (err, rows) => {
    if (err) {
        console.error("❌ Error reading users:", err.message);
        return;
    }

    console.log(`\nFound ${rows.length} users:`);
    console.table(rows); // This prints a beautiful table in your terminal

    // Check specifically for the Supervisor flag type
    if (rows.length > 0) {
        const firstUser = rows[0];
        console.log("\n--- DATA TYPE VERIFICATION ---");
        console.log(`is_supervisor type: ${typeof firstUser.is_supervisor} (Value: ${firstUser.is_supervisor})`);
    }

    db.close();
});