import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runVerification() {
  console.log('--- STARTING BACKEND COMPILATION & SANITY TESTS ---');

  // Test 1: BCrypt Password Hashing
  try {
    const password = 'testuser123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const isMatch = await bcrypt.compare(password, hash);
    if (isMatch) {
      console.log('✅ Test 1: BCrypt Hashing and signature matches successfully.');
    } else {
      throw new Error('BCrypt mismatch.');
    }
  } catch (error) {
    console.error('❌ Test 1: BCrypt validation failed:', error.message);
  }

  // Test 2: JWT Token Issuance & Verification
  try {
    const secret = 'test_secret_key_1234';
    const payload = { id: 1, email: 'test@example.com' };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret);
    if (decoded.email === payload.email) {
      console.log('✅ Test 2: JWT Token issuance & cryptographic verification successful.');
    } else {
      throw new Error('JWT payload mismatch.');
    }
  } catch (error) {
    console.error('❌ Test 2: JWT validation failed:', error.message);
  }

  // Test 3: PDF Document Generation
  try {
    const doc = new PDFDocument();
    const testDir = path.join(__dirname, '../temp_tests');
    fs.mkdirSync(testDir, { recursive: true });
    
    const outputPath = path.join(testDir, 'test_invoice.pdf');
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);
    
    doc.fontSize(20).text('Design Vallet Sanity Invoice Test', 100, 100);
    doc.end();

    writeStream.on('finish', () => {
      console.log(`✅ Test 3: PDFKit invoice generator outputted successfully to: ${outputPath}`);
      // Cleanup
      try {
        fs.unlinkSync(outputPath);
        fs.rmdirSync(testDir);
      } catch (e) {}
    });
  } catch (error) {
    console.error('❌ Test 3: PDF Generation failed:', error.message);
  }

  // Test 4: Supabase Mock Client Integration
  try {
    const dbModule = await import('../src/config/db.js');
    const db = dbModule.default;
    
    const { data: users } = await db.from('users').select('*').eq('email', 'admin@designvallet.com');
    if (users && users.length > 0 && users[0].email === 'admin@designvallet.com') {
      console.log('✅ Test 4: Supabase Client SDK mockup connection & SELECT query successful.');
    } else {
      throw new Error('Supabase client select returned invalid structure.');
    }
  } catch (error) {
    console.error('❌ Test 4: Supabase client validation failed:', error.message);
  }
}

runVerification();
