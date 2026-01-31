/**
 * Verification Script for Supabase + Turso Setup
 * 
 * This script tests the connection to both Supabase and Turso
 * Run with: npx ts-node scripts/verify-setup.ts
 */

import { createClient } from '@supabase/supabase-js';
import { createClient as createTursoClient } from '@libsql/client';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://erkapwbrlflitysminxq.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVya2Fwd2JybGZsaXR5c21pbnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3ODkyMjEsImV4cCI6MjA4MzM2NTIyMX0.mSsWvHAeM-imMLjGsWC6StgEU5cD1ArDPxN2gYq4ufI';
const TURSO_URL = process.env.EXPO_PUBLIC_TURSO_URL || 'libsql://tar-tarapp.aws-eu-west-1.turso.io';
const TURSO_TOKEN = process.env.EXPO_PUBLIC_TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk4MzkxMTQsImlkIjoiMjdmZDE0OTctYzcyNi00ZDlhLThkM2UtMTk4ZDFhMTg2NTg3IiwicmlkIjoiY2ViZTYwM2EtNDNmMS00YmI3LWIyMGMtOTUzNTk0NzNlYzUxIn0.2I8nXoN011jwsx72GW_tujWxrFgVhTBa-j-js86aDR5CF007osf8VxQwqJ5SDCtCFN-VM7NliAqb-gtMIlj8Aw';

async function verifySupabase() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Test authentication service
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Supabase session check failed:', sessionError.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    console.log('   Session status:', session ? 'Active' : 'No session');
    
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
}

async function verifyTurso() {
  console.log('\n🔍 Testing Turso connection...');
  
  try {
    const client = createTursoClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
    
    // Test database connection with a simple query
    const result = await client.execute('SELECT sqlite_version() as version');
    
    console.log('✅ Turso connection successful');
    console.log('   SQLite version:', result.rows[0]?.version);
    
    // Check if tables exist
    const tablesResult = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    const tables = tablesResult.rows.map(row => row.name);
    
    console.log('   Existing tables:', tables.length > 0 ? tables.join(', ') : 'None');
    
    if (!tables.includes('tasks')) {
      console.log('⚠️  Warning: tasks table not found. Run init-database.sql first!');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Turso connection failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting verification...\n');
  
  const supabaseOk = await verifySupabase();
  const tursoOk = await verifyTurso();
  
  console.log('\n📊 Verification Results:');
  console.log('   Supabase:', supabaseOk ? '✅ OK' : '❌ FAILED');
  console.log('   Turso:', tursoOk ? '✅ OK' : '❌ FAILED');
  
  if (supabaseOk && tursoOk) {
    console.log('\n✨ All systems ready! You can now run the app.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some connections failed. Please check your credentials.');
    process.exit(1);
  }
}

main();
