require("dotenv").config();

const fs = require("fs");
const { Client } = require("pg");

async function runSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    const schema = fs.readFileSync("schema.sql", "utf8");

    await client.query(schema);

    console.log("schema.sql executed successfully");
  } catch (error) {
    console.error("Schema execution failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

runSchema();