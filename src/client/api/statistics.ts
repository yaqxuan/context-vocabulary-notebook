import type { HomeStatisticsDto, StatisticsPageDto } from '../../shared/types';
import { apiRequest } from './client';

export function getHomeStatistics(): Promise<HomeStatisticsDto> {
  return apiRequest<HomeStatisticsDto>('/statistics/home');
}

export function getStatisticsPage(): Promise<StatisticsPageDto> {
  return apiRequest<StatisticsPageDto>('/statistics');
}
