import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadImage } from '../services/upload.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

const r = Router();

r.post(
  '/upload',
  authenticate,
  asyncHandler(async (req, res) => {
    const { image, folder } = req.body;
    if (!image) throw new AppError(400, 'Image payload is required', 'VALIDATION_ERROR');
    const result = await uploadImage(image, folder);
    res.json(result);
  }),
);

export default r;
