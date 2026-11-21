import { useEffect } from 'react';

const SITE_NAME = 'Alifco';

interface PageMeta {
  title: string;
  indexable: boolean;
}

function robotsTag(): HTMLMetaElement {
  let tag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = 'robots';
    document.head.append(tag);
  }
  return tag;
}

export function usePageMeta({ title, indexable }: PageMeta) {
  useEffect(() => {
    document.title = `${title} · ${SITE_NAME}`;
    robotsTag().content = indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow';
  }, [title, indexable]);
}
