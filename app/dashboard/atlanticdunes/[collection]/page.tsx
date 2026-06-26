import { redirect } from 'next/navigation';

const collectionToPage: Record<string, string> = {
  poles: 'manage-poles-domains',
  domains: 'manage-poles-domains',
  services: 'manage-services',
  products: 'manage-products',
  boutique: 'manage-boutique',
  news: 'manage-news',
  newsCategories: 'manage-news-categories',
  boutiqueCategories: 'manage-boutique-categories',
  entrepriseInfo: 'manage-entreprise-informations',
};

export default async function AtlanticDunesCollectionPage({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  const page = collectionToPage[collection];
  if (!page) {
    redirect('/dashboard/websites/atlanticdunes');
  }
  redirect(`/dashboard/websites/atlanticdunes/${page}`);
}
