import { Router } from 'express';
import * as c from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const r = Router();
r.use(authenticate);

r.get('/', c.list);
r.patch('/:id/read', c.markRead);
r.patch('/read-all', c.markAllRead);

export default r;
