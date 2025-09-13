// Export all article controller functions
export {
  getArticles,
  getArticle,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle
} from './crud.js';

export {
  searchArticles,
  getRelatedArticles,
  getRelatedArticlesByCategory,
  getPopularArticles,
  getFeaturedArticles,
  getArticlesByCategorySlug
} from './search.js';

export {
  getArticleStatistics
} from './statistics.js';

export {
  publishArticle,
  unpublishArticle
} from './publish.js';


