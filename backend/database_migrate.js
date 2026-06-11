import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Potential password variations from G1o2w3r4i5@@db...
const passwords = ['G1o2w3r4i5@', 'G1o2w3r4i5@@'];
const host = 'db.xxfjeysjcrgmukcpkmjk.supabase.co';
const port = 5432;
const database = 'postgres';
const user = 'postgres';

async function runMigration() {
  console.log("🚀 Starting database schema migrations against remote Supabase instance...");
  
  let client = null;
  let successPass = null;

  for (const password of passwords) {
    console.log(`Attempting connection with password: ${password.replace(/./g, '*')}`);
    const checkClient = new pg.Client({
      host,
      port,
      database,
      user,
      password,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await checkClient.connect();
      console.log("✅ Connection SUCCESSFUL!");
      client = checkClient;
      successPass = password;
      break;
    } catch (e) {
      console.log(`❌ Connection failed with this password: ${e.message}`);
      await checkClient.end().catch(() => {});
    }
  }

  if (!client) {
    console.error("❌ Failed to connect to database using any of the password variations.");
    process.exit(1);
  }

  try {
    // Save working password to .env
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace URL & keys in env
    const newDbUrl = `postgresql://${user}:${encodeURIComponent(successPass)}@${host}:${port}/${database}`;
    
    envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${newDbUrl}`);
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Updated DATABASE_URL in .env with the correct URL-encoded password.");

    // 1. Read and execute schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    console.log(`Reading schema from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log("Applying table schema definitions...");
    await client.query(schemaSql);
    console.log("✅ Schema applied successfully.");

    // 2. Read and execute seed.sql
    const seedPath = path.join(__dirname, '../database/seed.sql');
    console.log(`Reading seed from: ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log("Populating database with seed entries...");
    await client.query(seedSql);
    console.log("✅ Database seeding complete.");

    // 3. Set up Realtime replication publications safely
    console.log("Setting up Supabase Realtime replication on tables...");
    const pubTables = ['orders', 'downloads', 'images', 'coupons'];
    for (const table of pubTables) {
      try {
        await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE public.${table}`);
        console.log(`📡 Enabled realtime updates on table: ${table}`);
      } catch (pubErr) {
        console.log(`ℹ️ Realtime notice for table '${table}': ${pubErr.message}`);
      }
    }

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  } finally {
    await client.end();
    console.log("🔌 Database connection closed.");
  }
}

runMigration();
