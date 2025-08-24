import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:8000/api';
let adminToken;

// --- Helper Functions ---

const getAdminToken = async () => {
  if (adminToken) return adminToken;
  try {
    const response = await axios.post(`${API_URL}/users/auth/login`, {
      identifier: 'admin',
      password: 'Admin123!',
    });
    adminToken = response.data.data.tokens.accessToken;
    console.log('🔑 Obtained admin token successfully.');
    return adminToken;
  } catch (error) {
    console.error('❌ Failed to get admin token:', error.response?.data?.message || error.message);
    throw new Error('Authentication failed');
  }
};

const createTestArticle = async (title, slug, featuredImage) => {
  const token = await getAdminToken();
  try {
    const response = await axios.post(`${API_URL}/articles`, {
      title,
      slug,
      content: 'This is a test article for image deletion protection validation.',
      categories: ['68aa58cbe80ee3fa7fd21793'], // Use the valid category ID
      featuredImage,
      status: 'published',
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Full response from article creation:', JSON.stringify(response.data, null, 2));
    console.log(`✅ Created article '${title}' successfully with ID: ${response.data.data.article.id}`);
    return response.data.data.article;
  } catch (error) {
    console.error(`❌ Failed to create article '${title}':`, error.response?.data?.message || error.message);
    return null;
  }
};

const deleteImage = async (filename) => {
  const token = await getAdminToken();
  try {
    const response = await axios.delete(`${API_URL}/images/delete`, {
      data: { filename },
      headers: { Authorization: `Bearer ${token}` },
    });
    return { status: response.status, data: response.data };
  } catch (error) {
    return { status: error.response.status, data: error.response.data };
  }
};

const cleanupArticle = async (id) => {
  if (!id) return;
  const token = await getAdminToken();
  try {
    await axios.delete(`${API_URL}/articles/${id}`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    console.log(`🗑️ Cleaned up article ID: ${id}`);
  } catch (error) {
    console.error(`⚠️ Failed to clean up article ID ${id}:`, error.response?.data?.message || error.message);
  }
};

// --- Test Scenarios ---

const runTests = async () => {
  let testArticle;
  const protectedImage = 'e856eb1671a4844e10065a7e3bf25b5d.jpg';
  const unprotectedImage = 'unprotected-test-image.jpg';
  const uniqueSlug = `test-article-for-image-protection-${Date.now()}`;
  const imageDir = path.join(process.cwd(), 'images');
  const imagePath = path.join(imageDir, protectedImage);

  try {
    // --- SETUP: Create dummy image file ---
    console.log(`🔧 Creating dummy image file at: ${imagePath}`);
    fs.mkdirSync(imageDir, { recursive: true });
    fs.writeFileSync(imagePath, 'dummy content');

    console.log('🚀 Starting image deletion protection validation...');

    // --- Scenario 1: Attempt to delete a protected image ---
    console.log('\n--- SCENARIO 1: PROTECTED IMAGE ---');
    testArticle = await createTestArticle(
      'Test Article for Image Protection',
      uniqueSlug,
      `/media/images/${protectedImage}` // Pass the full path
    );

    if (testArticle) {
      const response = await deleteImage(protectedImage);
      console.log('Response from deleting protected image:', JSON.stringify(response.data, null, 2));

      if (response.status === 409) {
        console.log('✅ PASSED: Received 409 Conflict as expected.');
        if (response.data.message.includes(testArticle.slug)) {
          console.log('✅ PASSED: Error message contains the correct article slug.');
        } else {
          console.error(`❌ FAILED: Error message does not contain the correct slug. Expected: ${testArticle.slug}`);
        }
      } else {
        console.error(`❌ FAILED: Expected status 409, but received ${response.status}.`);
      }
    }

    // --- Scenario 2: Attempt to delete an unprotected image ---
    console.log('\n--- SCENARIO 2: UNPROTECTED IMAGE ---');
    const response = await deleteImage(unprotectedImage);
    console.log('Response from deleting unprotected image:', response.data);

    if (response.status === 404) {
      console.log('✅ PASSED: Received 404 Not Found for a non-existent image.');
    } else {
      console.error(`❌ FAILED: Expected status 404, but received ${response.status}.`);
    }

  } catch (error) {
    console.error('\n🚨 An unexpected error occurred during the test:', error.message);
  } finally {
    // --- Teardown & Cleanup ---
    console.log('\n--- CLEANUP ---');
    if (testArticle) {
        await cleanupArticle(testArticle.id);
    }
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log('🔧 Deleted dummy image file.');
    }
    console.log('\n🏁 Validation script finished.');
  }
};

runTests();

