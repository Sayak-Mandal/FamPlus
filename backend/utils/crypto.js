const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
// Use JWT_SECRET in .env to derive a key, fallback to a local safe value if not defined
const SECRET_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback_secret_key_for_development_purposes_only';

// Derive a stable 32-byte key from the secret
const KEY = crypto.createHash('sha256').update(SECRET_KEY).digest();

/**
 * Encrypts a plaintext string to a ciphertext string with random IV
 * @param {string} text 
 * @returns {string} iv:ciphertext formatted string
 */
function encrypt(text) {
  if (typeof text !== 'string') return text;
  if (!text) return text;
  
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return text;
  }
}

/**
 * Decrypts a ciphertext string back to plaintext
 * @param {string} text iv:ciphertext formatted string
 * @returns {string} decrypted plaintext or raw text if not encrypted
 */
function decrypt(text) {
  if (typeof text !== 'string') return text;
  if (!text) return text;

  const parts = text.split(':');
  if (parts.length !== 2) {
    // Return legacy unencrypted data without throwing
    return text;
  }

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // Fallback: If decryption fails, it might be unencrypted matching the iv:text format by coincidence
    return text;
  }
}

module.exports = { encrypt, decrypt };
