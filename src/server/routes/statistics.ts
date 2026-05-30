import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { getHomeStatistics, getStatisticsPageData } from '../domain/statistics.js';
import { asyncRoute } from '../http/asyncRoute.js';

export function statisticsRouter(db: Database): Router {
  const router = Router();

  router.get('/home', asyncRoute(async (_req, res) => {
    res.json(getHomeStatistics(db));
  }));

  router.get('/', asyncRoute(async (_req, res) => {
    res.json(getStatisticsPageData(db));
  }));

  return router;
}
