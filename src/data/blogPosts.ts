import { BlogPost } from '../types/directory';
import blogComparisonCover from '../assets/images/blog_ai_models_comparison_1794751868886.jpg';
import blogCodingCover from '../assets/images/blog_coding_workflow_1794751868081.jpg';
import blogVisualsCover from '../assets/images/blog_generative_visuals_1794751869558.jpg';
import aboutStudioCover from '../assets/images/about_aivora_studio_1794751869510.jpg';
import { BlogPostBlueprint, INITIAL_BLOG_META } from './blogMeta';

const COVER_MAP: Record<BlogPostBlueprint['coverKey'], string> = {
  comparison: blogComparisonCover,
  coding: blogCodingCover,
  visuals: blogVisualsCover,
  about: aboutStudioCover,
};

export const INITIAL_BLOG_POSTS: BlogPost[] = INITIAL_BLOG_META.map((meta) => ({
  ...meta,
  coverImage: COVER_MAP[meta.coverKey],
}));
