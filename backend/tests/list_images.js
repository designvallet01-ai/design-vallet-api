import db from '../src/config/db.js';

async function listImages() {
  try {
    const { data: images, error } = await db.from('images').select('*');
    if (error) {
      console.error('Error fetching images:', error);
    } else {
      console.log('Available images in Supabase:');
      images.forEach(img => {
        console.log(`- ID: ${img.id}, Title: ${img.title}, Category: ${img.category}, Price: ${img.price}, IsActive: ${img.is_active}`);
      });
    }
  } catch (e) {
    console.error('Exception:', e);
  }
}

listImages();
