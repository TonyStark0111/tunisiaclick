// Configuration for dynamic routes
export const dynamicRoutes = {
  '/auth/reset-password': {
    dynamic: 'force-dynamic',
    revalidate: false
  }
};
