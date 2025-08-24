import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const cleanupTestArticles = async () => {
  console.log('🚀 Starting cleanup of test articles...');
  let adminToken;

  try {
    // 1. Get Admin Token
    const loginResponse = await axios.post(`${API_URL}/users/auth/login`, {
      identifier: 'admin',
      password: 'Admin123!',
    });
    adminToken = loginResponse.data.data.tokens.accessToken;
    console.log('🔑 Admin token obtained.');

    // 2. Find articles to delete by fetching all and filtering
    console.log('Fetching all articles to find test data...');
    const allArticlesResponse = await axios.get(`${API_URL}/articles/admin`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        params: { limit: 1000 } // Fetch a large number of articles
    });

    const allArticles = allArticlesResponse.data.data.articles;
    const protectedImage = 'e856eb1671a4844e10065a7e3bf25b5d.jpg';
    const articlesToDelete = allArticles.filter(article =>
        article.featuredImage && article.featuredImage.includes(protectedImage)
    );

    if (articlesToDelete.length === 0) {
      console.log('✅ No test articles found to clean up.');
      return;
    }

    console.log(`🔍 Found ${articlesToDelete.length} test article(s) to delete.`);

    // 3. Delete each found article
    for (const article of articlesToDelete) {
      try {
        await axios.delete(`${API_URL}/articles/${article.id}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        console.log(`🗑️ Deleted article: ${article.title} (ID: ${article.id})`);
      } catch (deleteError) {
        console.error(`⚠️ Failed to delete article ${article.id}:`, deleteError.response?.data?.message || deleteError.message);
      }
    }

    console.log('✅ Cleanup complete.');

  } catch (error) {
    console.error('❌ An error occurred during cleanup:', error.response?.data?.message || error.message);
  }
};

cleanupTestArticles();

