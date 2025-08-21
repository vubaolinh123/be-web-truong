const mongoose = require('mongoose');

// Import models
const Category = require('./src/models/Category/index.js').default;
const User = require('./src/models/User/index.js').default;

async function checkDatabase() {
  try {
    await mongoose.connect('mongodb://localhost:27017/university');
    console.log('✅ Kết nối MongoDB thành công');
    
    // Get categories
    const categories = await Category.find({ status: 'active' }).select('name slug _id');
    console.log('\n📂 Danh mục hiện có:');
    categories.forEach(cat => console.log(`- ${cat.name} (slug: ${cat.slug}, id: ${cat._id})`));
    
    // Get users who can be authors
    const users = await User.find({ 
      role: { $in: ['admin', 'faculty'] }, 
      status: 'active' 
    }).select('username firstName lastName _id role');
    console.log('\n👥 Người dùng có thể làm tác giả:');
    users.forEach(user => console.log(`- ${user.firstName} ${user.lastName} (@${user.username}, role: ${user.role}, id: ${user._id})`));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

checkDatabase();
