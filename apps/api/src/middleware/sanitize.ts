import { RequestHandler } from 'express';

// Strips Mongo operator keys ($gt, $ne ...), dotted keys and __proto__ from user input.
export const clean = (v: any): any => {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) {
      if (k.startsWith('$') || k.includes('.') || k === '__proto__') delete v[k];
      else v[k] = clean(v[k]);
    }
  }
  return v;
};

export const sanitize: RequestHandler = (req, _res, next) => {
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
};
