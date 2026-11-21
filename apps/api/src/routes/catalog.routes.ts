import { Router } from 'express';
import * as c from '../controllers/catalog.controller';

const r = Router();
r.get('/categories', c.categories);
r.get('/restaurants', c.restaurants);
r.get('/restaurants/:slug', c.restaurant);
r.get('/foods', c.foods);
r.get('/search', c.search);
export default r;
