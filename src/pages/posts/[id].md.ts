import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedPosts, type Post } from '../../utils/site';
import { markdownResponse, postMarkdown } from '../../utils/markdown';

export const getStaticPaths = (async () => {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ params: { id: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props, site }) => {
  const { post } = props as { post: Post };
  return markdownResponse(postMarkdown(post, site));
};
