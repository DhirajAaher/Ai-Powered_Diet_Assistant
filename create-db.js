const mysql = require("mysql2/promise");

async function main() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Root@123",
    port: 3306,
  });
  await connection.query("CREATE DATABASE IF NOT EXISTS diet_app;");
  console.log("Database created successfully");
  await connection.end();
}

main().catch(console.error);
