/**
 * Test script for file validation utility
 * This script can be used to test the file validation functions
 */

import { 
  isValidImageFile, 
  correctImageMimeType, 
  validateAndCorrectImageFile,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_IMAGE_MIME_TYPES
} from './file-validation';

// Mock File object for testing
class MockFile {
  name: string;
  type: string;
  size: number;
  lastModified: number;

  constructor(name: string, size: number, type: string = '') {
    this.name = name;
    this.type = type;
    this.size = size;
    this.lastModified = Date.now();
  }
}

// Test cases
console.log('Testing file validation utility...\n');

// Test 1: Valid image file
console.log('Test 1: Valid image file');
const validFile = new MockFile('test.jpg', 1024 * 1024, 'image/jpeg') as unknown as File;
console.log('isValidImageFile result:', isValidImageFile(validFile));
console.log('Expected: true\n');

// Test 2: Valid image by extension but wrong MIME type
console.log('Test 2: Valid image by extension but wrong MIME type');
const wrongMimeFile = new MockFile('test.png', 1024 * 500, 'application/json') as unknown as File;
console.log('isValidImageFile result:', isValidImageFile(wrongMimeFile));
console.log('Expected: false (because MIME type is wrong)');
console.log('After correction:', correctImageMimeType(wrongMimeFile).type);
console.log('Expected corrected type: image/png\n');

// Test 3: Invalid file extension
console.log('Test 3: Invalid file extension');
const invalidFile = new MockFile('test.txt', 1024, 'text/plain') as unknown as File;
console.log('isValidImageFile result:', isValidImageFile(invalidFile));
console.log('Expected: false\n');

// Test 4: Large file (>10MB)
console.log('Test 4: Large file (>10MB)');
const largeFile = new MockFile('large.jpg', 15 * 1024 * 1024, 'image/jpeg') as unknown as File;
console.log('isValidImageFile result:', isValidImageFile(largeFile));
console.log('Expected: false\n');

// Test 5: validateAndCorrectImageFile function
console.log('Test 5: validateAndCorrectImageFile function with wrong MIME type');
const testFile = new MockFile('image.png', 1024 * 500, 'application/json') as unknown as File;
validateAndCorrectImageFile(testFile, 'Test image').then(result => {
  console.log('Validation result:', result.error);
  console.log('Corrected file type:', result.file?.type);
  console.log('Expected: No error, type should be image/png\n');
});

// Test 6: Supported extensions and MIME types
console.log('Test 6: Supported extensions and MIME types');
console.log('Supported extensions:', SUPPORTED_IMAGE_EXTENSIONS.join(', '));
console.log('Supported MIME types:', SUPPORTED_IMAGE_MIME_TYPES.join(', '));

console.log('\nAll tests completed.');