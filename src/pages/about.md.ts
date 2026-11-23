import type { APIRoute } from 'astro';
import { aboutMarkdown, markdownResponse } from '../utils/markdown';

export const GET: APIRoute = ({ site }) => markdownResponse(aboutMarkdown(site));
