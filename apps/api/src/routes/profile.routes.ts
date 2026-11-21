import { Router } from 'express';
import * as c from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const r = Router();
r.use(authenticate);

r.get('/', c.getProfile);
r.patch('/', validate(c.updateProfileSchema), c.updateProfile);

r.post('/addresses', validate(c.addressSchema), c.addAddress);
r.patch('/addresses/:id', validate(c.updateAddressSchema), c.updateAddress);
r.delete('/addresses/:id', c.deleteAddress);

export default r;
