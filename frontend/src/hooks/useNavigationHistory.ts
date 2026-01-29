import { useState, useEffect, useCallback } from 'react';
import { Page } from '../App';

export const useNavigationHistory = (initialPage: Page) => {
  // Helper to extract page from hash
  const getPageFromHash = (): Page | null => {
    const hash = window.location.hash.replace('#', '');
    return hash ? (hash as Page) : null;
  };

  const [currentPage, setCurrentPage] = useState<Page>(() => {
    return getPageFromHash() || initialPage;
  });

  useEffect(() => {
    // 1. Handle browser navigation (Back/Forward)
    const handleHashChange = () => {
      const page = getPageFromHash();
      if (page) {
        setCurrentPage(page);
      } else {
        // Fallback to initial if hash is cleared
        setCurrentPage(initialPage);
      }
    };

    // 2. Ensure hash is set on initial load if empty
    if (!getPageFromHash()) {
      window.location.hash = initialPage;
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [initialPage]);

  const navigateTo = useCallback((page: Page) => {
    if (page === currentPage) return;
    window.location.hash = page;
  }, [currentPage]);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const goForward = useCallback(() => {
    window.history.forward();
  }, []);

  return {
    currentPage,
    navigateTo,
    goBack,
    goForward,
    // Since we rely on browser history, we can't easily check stack size. 
    // We enable them by default; browser will ignore if invalid.
    canGoBack: true,
    canGoForward: true,
  };
};
