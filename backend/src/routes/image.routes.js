import express from 'express';
import multer from 'multer';
import { listImages, getImageDetails, uploadImage, deleteImage, getMockPreview, getMockDownload } from '../controllers/image.controller.js';
import { verifyToken, verifyAdmin } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public Image Gallery routes
router.get('/', listImages);
router.get('/:id', getImageDetails);

// Developer offline mock asset routes
router.get('/mock-preview/:keyName', getMockPreview);
router.get('/mock-download/:keyName', getMockDownload);

// Admin-only Image Modification routes
router.post('/upload', verifyToken, verifyAdmin, upload.single('image'), uploadImage);
router.delete('/:id', verifyToken, verifyAdmin, deleteImage);

export default router;
