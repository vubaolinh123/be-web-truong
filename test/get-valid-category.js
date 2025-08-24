import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const getValidCategory = async () => {
  try {
    console.log('🚀 Fetching admin token...');
    const loginResponse = await axios.post(`${API_URL}/users/auth/login`, {
      identifier: 'admin',
      password: 'Admin123!',
    });
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Token obtained.');

    console.log('\n🚀 Fetching categories...');
    const categoriesResponse = await axios.get(`${API_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const categories = categoriesResponse.data.data.categories;

    if (categories && categories.length > 0) {
      const validCategory = categories[0];
      console.log('\n✨ Found a valid category:');
      console.log(`   ID: ${validCategory.id}`);
      console.log(`   Name: ${validCategory.name}`);
      console.log('\nPlease use this ID in the validation script.');
    } else {
      console.warn('⚠️ No categories found. Please create a category first.');
    }
  } catch (error) {
    console.error('❌ An error occurred:', error.response?.data?.message || error.message);
  }
};

getValidCategory();

