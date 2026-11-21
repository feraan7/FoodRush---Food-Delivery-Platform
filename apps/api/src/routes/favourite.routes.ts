import { Router } from 'express';
import * as c from '../controllers/favourite.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const r = Router();
r.use(authenticate);

r.get('/', c.list);
r.post('/toggle', validate(c.toggleSchema), c.toggle);

export default r;
