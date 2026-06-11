import db from '../config/db.js';
import { uploadToStorage } from '../config/s3.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Jimp } from 'jimp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createWatermarkedMock(fileBuffer) {
  try {
    const image = await Jimp.read(fileBuffer);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    const text = "DESIGN VALLET PREVIEW";

    const width = image.bitmap.width;
    const height = image.bitmap.height;

    // Overlay the text in a grid across the preview image
    const stepX = Math.max(300, Math.floor(width / 3));
    const stepY = Math.max(200, Math.floor(height / 3));

    for (let x = stepX / 2; x < width; x += stepX) {
      for (let y = stepY / 2; y < height; y += stepY) {
        const textWidth = Jimp.measureText(font, text);
        const textHeight = Jimp.measureTextHeight(font, text, width);
        image.print(
          font,
          Math.max(0, x - textWidth / 2),
          Math.max(0, y - textHeight / 2),
          text
        );
      }
    }

    return await image.getBuffer("image/jpeg");
  } catch (error) {
    console.error("Error creating watermark image preview:", error);
    return fileBuffer;
  }
}

export async function listImages(req, res) {
  try {
    const { category, search } = req.query;
    
    // Construct dynamic Supabase select query
    let queryBuilder = db
      .from('images')
      .select('id, title, description, category, price, preview_s3_key')
      .eq('is_active', true);

    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
    }

    if (search) {
      // Supabase supports standard postgres logical OR matching or simple search triggers
      queryBuilder = queryBuilder.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Sort by creation date descending
    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    const { data: rows, error } = await queryBuilder;

    if (error) throw new Error(error.message);

    const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
    const formattedRows = rows.map(img => {
      let previewUrl = img.preview_s3_key;
      if (img.preview_s3_key.startsWith('mock://') || img.preview_s3_key.startsWith('previews/')) {
        const keyName = path.basename(img.preview_s3_key);
        previewUrl = `${req.protocol}://${host}/api/images/mock-preview/${keyName}`;
      }
      return {
        ...img,
        preview_url: previewUrl
      };
    });

    return res.json(formattedRows);
  } catch (error) {
    console.error('List images error:', error);
    return res.status(500).json({ error: 'Failed to retrieve image catalog.' });
  }
}

export async function getImageDetails(req, res) {
  try {
    const { id } = req.params;
    
    const { data: img, error } = await db
      .from('images')
      .select('id, title, description, category, price, preview_s3_key')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !img) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    let previewUrl = img.preview_s3_key;
    if (img.preview_s3_key.startsWith('mock://') || img.preview_s3_key.startsWith('previews/')) {
      const keyName = path.basename(img.preview_s3_key);
      const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
      previewUrl = `${req.protocol}://${host}/api/images/mock-preview/${keyName}`;
    }

    return res.json({
      ...img,
      preview_url: previewUrl
    });
  } catch (error) {
    console.error('Get image details error:', error);
    return res.status(500).json({ error: 'Failed to retrieve image details.' });
  }
}

export async function uploadImage(req, res) {
  try {
    const { title, description, category, price } = req.body;
    
    if (!title || !category || !price || !req.file) {
      return res.status(400).json({ error: 'Title, category, price, and raw image file are required.' });
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'Price must be a valid positive decimal number.' });
    }

    const originalFilename = req.file.originalname;
    const fileExt = path.extname(originalFilename);
    const uniqueId = Date.now() + '_' + Math.round(Math.random() * 1E9);
    
    const originalKey = `originals/${uniqueId}_orig${fileExt}`;
    const previewKey = `previews/${uniqueId}_watermarked${fileExt}`;

    const originalUrl = await uploadToStorage(req.file.buffer, originalKey, req.file.mimetype, true);
    const watermarkedBuffer = await createWatermarkedMock(req.file.buffer);
    const previewUrl = await uploadToStorage(watermarkedBuffer, previewKey, req.file.mimetype, false);

    // Save details to Supabase table
    const { data: created, error } = await db
      .from('images')
      .insert({
        title,
        description: description || '',
        category,
        price: priceNum,
        original_s3_key: originalKey,
        preview_s3_key: previewKey
      })
      .select()
      .single();

    if (error || !created) {
      throw new Error(error?.message || 'Upload insertion failed.');
    }

    return res.status(201).json({
      message: 'Image uploaded and processed successfully.',
      image: {
        id: created.id,
        title: created.title,
        description: created.description,
        category: created.category,
        price: created.price,
        preview_url: previewUrl.startsWith('mock://') 
          ? `${req.protocol}://${req.get('host') || `localhost:${process.env.PORT || 5000}`}/api/images/mock-preview/${path.basename(previewKey)}` 
          : previewUrl
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return res.status(500).json({ error: 'Failed to upload and process image.' });
  }
}

export async function deleteImage(req, res) {
  try {
    const { id } = req.params;
    
    // Soft delete catalog items
    const { data, error } = await db
      .from('images')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw new Error(error.message);

    return res.json({ message: 'Image successfully deactivated/removed from marketplace catalog.' });
  } catch (error) {
    console.error('Delete image error:', error);
    return res.status(500).json({ error: 'Failed to delete image.' });
  }
}

export async function getMockPreview(req, res) {
  try {
    const { keyName } = req.params;
    const filePath = path.join(__dirname, '../../mock_storage/previews', keyName);
    
    if (fs.existsSync(filePath)) {
      const ext = path.extname(keyName).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      return fs.createReadStream(filePath).pipe(res);
    }
    
    // Fallback to logo.jpg if preview not found
    const fallbackPath = path.join(__dirname, '../../mock_storage/logo.jpg');
    if (fs.existsSync(fallbackPath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      return fs.createReadStream(fallbackPath).pipe(res);
    }
    
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(`
      <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a2e"/>
        <text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="#e94560" dominant-baseline="middle" text-anchor="middle">
          [Watermarked Preview]
        </text>
      </svg>
    `);
  } catch (error) {
    return res.status(500).json({ error: 'Error sending mock preview.' });
  }
}

export async function getMockDownload(req, res) {
  try {
    const { keyName } = req.params;
    const filePath = path.join(__dirname, '../../mock_storage/originals', keyName);
    
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${keyName}"`);
      const ext = path.extname(keyName).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      return fs.createReadStream(filePath).pipe(res);
    }

    // Fallback to logo.jpg if original not found
    const fallbackPath = path.join(__dirname, '../../mock_storage/logo.jpg');
    if (fs.existsSync(fallbackPath)) {
      res.setHeader('Content-Disposition', `attachment; filename="original_${keyName}"`);
      res.setHeader('Content-Type', 'image/jpeg');
      return fs.createReadStream(fallbackPath).pipe(res);
    }

    res.setHeader('Content-Disposition', `attachment; filename="original_image_${keyName}.png"`);
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(`
      <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#0f0f1a"/>
        <text x="50%" y="50%" font-family="sans-serif" font-size="60" fill="#00adb5" dominant-baseline="middle" text-anchor="middle">
          Handloom craft - Original Purchased High-Resolution Image
        </text>
      </svg>
    `);
  } catch (error) {
    return res.status(500).json({ error: 'Error downloading mock file.' });
  }
}
